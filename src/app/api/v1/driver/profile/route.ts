import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ERRORS, okV1, requireV1Auth } from "@/lib/v1/api";

function driverPayload(d: {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  avatar: string | null;
  status: string;
  city: string | null;
  rating: number;
  totalTrips: number;
  walletBalance: number;
  carMake: string | null;
  carModel: string | null;
  plateNumber: string | null;
  vehicleType: string;
}) {
  return {
    id: String(d.id),
    name: d.name || null,
    email: d.email,
    phone: d.phone,
    avatarUrl: d.avatar,
    city: d.city,
    walletBalance: d.walletBalance,
    currency: "SAR",
    rating: d.rating,
    totalTrips: d.totalTrips,
    kycStatus: d.status,
    vehicle:
      d.carMake || d.carModel || d.plateNumber
        ? {
            make: d.carMake,
            model: d.carModel,
            plate: d.plateNumber,
            class: d.vehicleType,
          }
        : null,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireV1Auth(req, { role: "driver" });
  if ("error" in auth) return auth.error;

  const driver = await prisma.driver.findUnique({
    where: { id: auth.session.userId },
  });
  if (!driver) return ERRORS.notFound("الحساب");
  return okV1(driverPayload(driver));
}

export async function PATCH(req: NextRequest) {
  const auth = await requireV1Auth(req, { role: "driver" });
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
    const updated = await prisma.driver.update({
      where: { id: auth.session.userId },
      data: patch,
    });
    return okV1(driverPayload(updated));
  } catch (err) {
    return ERRORS.serverError(err);
  }
}
