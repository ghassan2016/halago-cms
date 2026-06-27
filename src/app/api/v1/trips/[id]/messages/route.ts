import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ERRORS, okV1, requireV1Auth } from "@/lib/v1/api";
import { publish } from "@/lib/v1/events";
import { notifyUser } from "@/lib/v1/push";

// رسائل الدردشة العميل↔الكابتن لرحلة محدّدة.
// GET  /api/v1/trips/{id}/messages  → قائمة الرسائل
// POST /api/v1/trips/{id}/messages  → إرسال رسالة (+ بثّ SSE + إشعار الطرف الآخر)

async function loadTripForUser(id: number, userId: number, role: string) {
  const trip = await prisma.trip.findUnique({
    where: { id },
    select: { id: true, customerId: true, driverId: true },
  });
  if (!trip) return { error: ERRORS.notFound("الرحلة") } as const;
  const owns = role === "customer" ? trip.customerId === userId : trip.driverId === userId;
  if (!owns) return { error: ERRORS.forbidden() } as const;
  return { trip } as const;
}

function msgToJson(m: {
  id: number;
  senderType: string;
  senderId: number;
  text: string;
  createdAt: Date;
}) {
  return {
    id: String(m.id),
    senderType: m.senderType,
    senderId: String(m.senderId),
    text: m.text,
    createdAt: m.createdAt,
  };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1Auth(req);
  if ("error" in auth) return auth.error;
  const id = Number(params.id);
  if (!Number.isFinite(id)) return ERRORS.notFound("الرحلة");

  const res = await loadTripForUser(id, auth.session.userId, auth.session.role);
  if ("error" in res) return res.error;

  const messages = await prisma.tripMessage.findMany({
    where: { tripId: id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  // علّم رسائل الطرف الآخر كمقروءة
  await prisma.tripMessage.updateMany({
    where: { tripId: id, senderType: { not: auth.session.role }, readAt: null },
    data: { readAt: new Date() },
  });

  return okV1({ items: messages.map(msgToJson) });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1Auth(req);
  if ("error" in auth) return auth.error;
  const id = Number(params.id);
  if (!Number.isFinite(id)) return ERRORS.notFound("الرحلة");

  const res = await loadTripForUser(id, auth.session.userId, auth.session.role);
  if ("error" in res) return res.error;

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return ERRORS.validation("نص الرسالة مطلوب");
  }
  const text = (body.text ?? "").trim();
  if (!text) return ERRORS.validation("نص الرسالة مطلوب");
  if (text.length > 1000) return ERRORS.validation("الرسالة طويلة جداً");

  const msg = await prisma.tripMessage.create({
    data: {
      tripId: id,
      senderType: auth.session.role,
      senderId: auth.session.userId,
      text,
    },
  });

  const json = msgToJson(msg);

  // بثّ لحظي على قناة الرحلة
  publish({ channel: `trip:${id}`, type: "trip.message", payload: json });

  // إشعار Push للطرف الآخر
  const { trip } = res;
  if (auth.session.role === "customer" && trip.driverId) {
    void notifyUser("driver", trip.driverId, {
      title: "رسالة جديدة من العميل",
      body: text,
      deepLink: `halago://trip/${id}/chat`,
      data: { tripId: String(id), kind: "chat" },
    });
  } else if (auth.session.role === "driver" && trip.customerId) {
    void notifyUser("customer", trip.customerId, {
      title: "رسالة جديدة من الكابتن",
      body: text,
      deepLink: `halago://trip/${id}/chat`,
      data: { tripId: String(id), kind: "chat" },
    });
  }

  return okV1(json);
}
