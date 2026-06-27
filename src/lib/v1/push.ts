// Push notifications via Firebase Cloud Messaging.
// dev: يطبع في الـ console فقط (لو env vars مفقودة)
// prod: يستخدم firebase-admin (يُثبَّت كـ optional dep بعد npm install)

import { prisma } from "@/lib/prisma";

let cachedMessaging: unknown = null;
let cachedAttempted = false;

interface FcmMessaging {
  sendEachForMulticast(msg: unknown): Promise<{
    responses: Array<{ success: boolean; error?: { code: string } }>;
  }>;
}

async function getMessaging(): Promise<FcmMessaging | null> {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  if (cachedAttempted) return cachedMessaging as FcmMessaging | null;
  cachedAttempted = true;

  try {
    // dynamic import لأن firebase-admin قد لا يكون مثبّتاً في كل البيئات
    const admin = (await import("firebase-admin" as string)) as any;
    if (!admin.apps || admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
    cachedMessaging = admin.messaging();
    return cachedMessaging as FcmMessaging;
  } catch (e) {
    console.warn("[push] firebase-admin غير متاح:", e);
    return null;
  }
}

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  deepLink?: string;
}

export async function notifyUser(
  ownerType: "customer" | "driver",
  ownerId: number,
  payload: PushPayload,
): Promise<void> {
  const tokens = await prisma.deviceToken.findMany({
    where: { ownerType, ownerId, active: true },
    select: { token: true, locale: true, id: true },
  });
  if (tokens.length === 0) return;

  const messaging = await getMessaging();
  if (!messaging) {
    console.log(
      `[push:dev] → ${ownerType}#${ownerId} (${tokens.length} devices): ${payload.title} — ${payload.body}`,
    );
    return;
  }

  const data: Record<string, string> = {
    ...payload.data,
    ...(payload.deepLink ? { deepLink: payload.deepLink } : {}),
  };

  const response = await messaging.sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: { title: payload.title, body: payload.body },
    data,
    android: { priority: "high" },
    apns: {
      headers: { "apns-priority": "10" },
      payload: { aps: { sound: "default" } },
    },
  });

  const invalid: number[] = [];
  response.responses.forEach((r: { success: boolean; error?: { code: string } }, i: number) => {
    if (!r.success) {
      const code = r.error?.code || "";
      if (
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-argument")
      ) {
        invalid.push(tokens[i].id);
      }
    }
  });
  if (invalid.length) {
    await prisma.deviceToken.updateMany({
      where: { id: { in: invalid } },
      data: { active: false },
    });
  }
}

export async function notifyTripAccepted(tripId: number, customerId: number) {
  return notifyUser("customer", customerId, {
    title: "السائق في الطريق إليك",
    body: "تفاصيل الرحلة في التطبيق",
    deepLink: `halago://trip/${tripId}`,
    data: { tripId: String(tripId), kind: "trip_accepted" },
  });
}

export async function notifyTripArrived(tripId: number, customerId: number) {
  return notifyUser("customer", customerId, {
    title: "السائق وصل",
    body: "اذهب للسيارة الآن",
    deepLink: `halago://trip/${tripId}`,
    data: { tripId: String(tripId), kind: "trip_arrived" },
  });
}

export async function notifyTripCompleted(tripId: number, customerId: number) {
  return notifyUser("customer", customerId, {
    title: "وصلت بأمان!",
    body: "قيّم سائقك من فضلك",
    deepLink: `halago://trip/${tripId}/rate`,
    data: { tripId: String(tripId), kind: "trip_completed" },
  });
}
