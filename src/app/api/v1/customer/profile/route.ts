import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ERRORS, okV1, requireV1Auth } from "@/lib/v1/api";

function customerPayload(c: {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  avatar: string | null;
  city: string | null;
  walletBalance: number;
  rating: number;
  totalTrips: number;
}) {
  return {
    id: String(c.id),
    name: c.name || null,
    email: c.email,
    phone: c.phone,
    avatarUrl: c.avatar,
    city: c.city,
    walletBalance: c.walletBalance,
    currency: "SAR",
    rating: c.rating,
    totalTrips: c.totalTrips,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireV1Auth(req, { role: "customer" });
  if ("error" in auth) return auth.error;

  const customer = await prisma.customer.findUnique({
    where: { id: auth.session.userId },
  });
  if (!customer) return ERRORS.notFound("الحساب");
  return okV1(customerPayload(customer));
}

export async function PATCH(req: NextRequest) {
  const auth = await requireV1Auth(req, { role: "customer" });
  if ("error" in auth) return auth.error;

  let body: { name?: string; email?: string; city?: string; avatarUrl?: string };
  try {
    body = await req.json();
  } catch {
    return ERRORS.validation("body غير صالح");
  }

  const patch: Record<string, string | null> = {};
  if (typeof body.name === "string") {
    const n = body.name.trim();
    if (n.length < 2) return ERRORS.validation("الاسم قصير جداً");
    patch.name = n;
  }
  if (typeof body.email === "string") {
    const e = body.email.trim();
    if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return ERRORS.validation("بريد إلكتروني غير صالح");
    }
    patch.email = e || null;
  }
  if (typeof body.city === "string") patch.city = body.city.trim() || null;
  if (typeof body.avatarUrl === "string") patch.avatar = body.avatarUrl;

  try {
    const updated = await prisma.customer.update({
      where: { id: auth.session.userId },
      data: patch,
    });
    return okV1(customerPayload(updated));
  } catch (err) {
    return ERRORS.serverError(err);
  }
}
