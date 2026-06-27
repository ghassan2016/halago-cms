import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ERRORS, okV1 } from "@/lib/v1/api";
import { signAccessToken, signRefreshToken } from "@/lib/v1/jwt";
import { verifyOtp } from "@/lib/v1/otp";
import { normalizeSaudiPhone } from "@/lib/v1/phone";

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
    name: c.name,
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
    name: d.name,
    email: d.email,
    phone: d.phone,
    avatarUrl: d.avatar,
    city: d.city,
    walletBalance: d.walletBalance,
    currency: "SAR",
    rating: d.rating,
    totalTrips: d.totalTrips,
    kycStatus: d.status, // pending | approved | rejected | suspended
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

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, {
    max: 10,
    windowMs: 60_000,
    key: "v1-verify-otp",
  });
  if (limited) return ERRORS.rateLimited(60);

  let body: { sessionId?: string; code?: string; phone?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return ERRORS.validation("body غير صالح");
  }

  const { sessionId, code } = body;
  if (!sessionId || !code) {
    return ERRORS.validation("sessionId وcode مطلوبان");
  }
  if (!/^\d{6}$/.test(code)) return ERRORS.invalidOtp();

  const result = await verifyOtp({ sessionId, code });
  if (!result.ok) {
    switch (result.code) {
      case "EXPIRED":
        return ERRORS.otpExpired();
      case "ATTEMPTS_EXCEEDED":
        return ERRORS.rateLimited(300);
      case "INVALID":
      case "NOT_FOUND":
      default:
        return ERRORS.invalidOtp();
    }
  }

  const phone = result.phone;
  const role = result.role;

  // التأكّد من تطابق الـ phone في الطلب (اختياري لكنّه طبقة حماية إضافية)
  if (body.phone) {
    const normalized = normalizeSaudiPhone(body.phone);
    if (normalized && normalized !== phone) {
      return ERRORS.invalidOtp();
    }
  }

  try {
    if (role === "customer") {
      let customer = await prisma.customer.findFirst({ where: { phone } });
      let isNewUser = false;
      if (!customer) {
        customer = await prisma.customer.create({
          data: { name: "", phone, city: "الرياض" },
        });
        isNewUser = true;
      }
      const token = await signAccessToken({ userId: customer.id, role });
      const refreshToken = await signRefreshToken({ userId: customer.id, role });

      return okV1({
        token,
        refreshToken,
        isNewUser,
        user: { ...customerPayload(customer), isNewUser },
      });
    } else {
      let driver = await prisma.driver.findFirst({ where: { phone } });
      let isNewUser = false;
      if (!driver) {
        // في dev نسمح بإنشاء سائق pending لتسهيل الاختبار
        driver = await prisma.driver.create({
          data: { name: "", phone, status: "pending", city: "الرياض" },
        });
        isNewUser = true;
      }
      const token = await signAccessToken({ userId: driver.id, role });
      const refreshToken = await signRefreshToken({ userId: driver.id, role });

      return okV1({
        token,
        refreshToken,
        isNewUser,
        user: { ...driverPayload(driver), isNewUser },
      });
    }
  } catch (err) {
    return ERRORS.serverError(err);
  }
}
