import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeFare, roadDistanceKm, resolveSurge } from "@/lib/pricing";
import { ERRORS, okV1, requireV1Auth } from "@/lib/v1/api";
import { emitNewTripForNearbyDrivers } from "@/lib/v1/events";
import { durationFromDistance, nextTripNumber, tripToJson } from "@/lib/v1/trips";

/**
 * POST /api/v1/customer/trips — إنشاء طلب رحلة جديد (status: pending)
 * body: {
 *   pickup: {lat, lng, address?},
 *   drop:   {lat, lng, address?},
 *   classKey: "economy"|"comfort"|...,
 *   paymentMethod: "cash"|"wallet"|"card",
 *   serviceType?: "ride"|"delivery",
 *   promoCode?: string
 * }
 */
export async function POST(req: NextRequest) {
  const auth = await requireV1Auth(req, { role: "customer" });
  if ("error" in auth) return auth.error;

  let body: {
    pickup?: { lat?: number; lng?: number; address?: string };
    drop?: { lat?: number; lng?: number; address?: string };
    classKey?: string;
    paymentMethod?: string;
    serviceType?: string;
  };
  try {
    body = await req.json();
  } catch {
    return ERRORS.validation("body غير صالح");
  }

  const pLat = Number(body.pickup?.lat);
  const pLng = Number(body.pickup?.lng);
  const dLat = Number(body.drop?.lat);
  const dLng = Number(body.drop?.lng);
  if ([pLat, pLng, dLat, dLng].some((n) => !Number.isFinite(n))) {
    return ERRORS.validation("نقاط الانطلاق والوصول مطلوبة");
  }

  const serviceType = body.serviceType === "delivery" ? "delivery" : "ride";
  const classKey = String(body.classKey || "economy");
  const paymentMethod = ["cash", "wallet", "card"].includes(String(body.paymentMethod))
    ? String(body.paymentMethod)
    : "cash";

  // عميل نشط؟
  const customer = await prisma.customer.findUnique({
    where: { id: auth.session.userId },
  });
  if (!customer || !customer.active) return ERRORS.notFound("الحساب");

  // هل لديه رحلة نشطة؟ لا نسمح بإنشاء رحلة جديدة
  const active = await prisma.trip.findFirst({
    where: {
      customerId: customer.id,
      status: { in: ["pending", "accepted", "arrived", "in_progress"] },
    },
  });
  if (active) {
    return ERRORS.validation("لديك رحلة نشطة بالفعل", {
      activeTripId: String(active.id),
    });
  }

  // حساب الأجرة
  const rule = await prisma.pricingRule.findFirst({
    where: { vehicleType: "car", serviceType, active: true },
  });
  if (!rule) return ERRORS.serverError("لا توجد قاعدة تسعير");

  const vClass = await prisma.vehicleClass.findUnique({ where: { key: classKey } });
  if (!vClass) return ERRORS.validation("فئة المركبة غير صالحة");

  const road = await roadDistanceKm(pLat, pLng, dLat, dLng);
  const distance = road.km;
  if (distance < 0.1) return ERRORS.validation("المسافة قصيرة جداً");
  const duration = durationFromDistance(distance);

  const now = new Date();
  const surgeRules = await prisma.surgeRule.findMany({ where: { active: true } });
  const scheduled = resolveSurge(surgeRules, now.getDay(), now.getHours());
  const surge = {
    multiplier: scheduled.multiplier,
    name: scheduled.name,
    source: scheduled.multiplier > 1 ? ("scheduled" as const) : null,
  };

  const breakdown = computeFare(
    rule,
    distance,
    duration,
    0,
    surge,
    { name: "", multiplier: 1 },
    { name: vClass.name, multiplier: vClass.multiplier },
  );

  // التحقّق من رصيد المحفظة إن كان الدفع منها
  if (paymentMethod === "wallet" && customer.walletBalance < breakdown.total) {
    return ERRORS.validation("رصيد المحفظة غير كافٍ");
  }

  try {
    const number = await nextTripNumber();
    const trip = await prisma.trip.create({
      data: {
        number,
        type: serviceType,
        status: "pending",
        customerId: customer.id,
        pickupAddress: body.pickup?.address || null,
        pickupLat: pLat,
        pickupLng: pLng,
        dropAddress: body.drop?.address || null,
        dropLat: dLat,
        dropLng: dLng,
        city: customer.city,
        distance,
        duration,
        fare: breakdown.total,
        paymentMethod,
        paymentStatus: paymentMethod === "cash" ? "pending" : "pending",
      },
      include: { driver: true, customer: true },
    });

    emitNewTripForNearbyDrivers(trip.id, customer.city);
    return okV1(tripToJson(trip));
  } catch (err) {
    return ERRORS.serverError(err);
  }
}

/** GET /api/v1/customer/trips — قائمة الرحلات (paginated) */
export async function GET(req: NextRequest) {
  const auth = await requireV1Auth(req, { role: "customer" });
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const perPage = Math.min(50, Math.max(1, Number(searchParams.get("per_page") || "15")));
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  const where = {
    customerId: auth.session.userId,
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
  };

  const [total, trips] = await Promise.all([
    prisma.trip.count({ where }),
    prisma.trip.findMany({
      where,
      include: { driver: true },
      orderBy: { createdAt: "desc" },
      take: perPage,
      skip: (page - 1) * perPage,
    }),
  ]);

  return okV1(
    {
      items: trips.map((t) => tripToJson(t)),
    },
    {
      page,
      perPage,
      total,
      hasMore: page * perPage < total,
    },
  );
}
