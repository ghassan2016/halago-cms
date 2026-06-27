import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeFare, haversineKm, resolveSurge } from "@/lib/pricing";
import { ERRORS, okV1, requireV1Auth } from "@/lib/v1/api";
import { durationFromDistance } from "@/lib/v1/trips";

/**
 * تقدير الأجرة لجميع فئات المركبات دفعة واحدة (للموبايل).
 * body: { pickup: {lat, lng}, drop: {lat, lng}, serviceType?: "ride"|"delivery" }
 *
 * يرجع: { distance, duration, classes: [{key, name, fare, breakdown, eta}] }
 */
export async function POST(req: NextRequest) {
  const auth = await requireV1Auth(req, { role: "customer" });
  if ("error" in auth) return auth.error;

  let body: {
    pickup?: { lat?: number; lng?: number };
    drop?: { lat?: number; lng?: number };
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
  const distance = Math.round(haversineKm(pLat, pLng, dLat, dLng) * 100) / 100;
  if (distance < 0.1) return ERRORS.validation("المسافة قصيرة جداً");
  const duration = durationFromDistance(distance);

  // قاعدة التسعير (vehicleType=car حتى يستخدم نفس الأساس لكل الفئات)
  const rule = await prisma.pricingRule.findFirst({
    where: { vehicleType: "car", serviceType, active: true },
  });
  if (!rule) return ERRORS.serverError("لا توجد قاعدة تسعير");

  // فئات المركبات (Economy/Comfort/XL/Black)
  const classes = await prisma.vehicleClass.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  // الذروة المجدولة الحالية
  const now = new Date();
  const surgeRules = await prisma.surgeRule.findMany({ where: { active: true } });
  const scheduled = resolveSurge(surgeRules, now.getDay(), now.getHours());
  const surge = {
    multiplier: scheduled.multiplier,
    name: scheduled.name,
    source: scheduled.multiplier > 1 ? ("scheduled" as const) : null,
  };

  // عدد السائقين القريبين (للـ ETA)
  const nearbyDrivers = await prisma.driver.count({
    where: { available: true, status: "approved" },
  });

  // ETA أوّلي: 3 دقائق إن وُجد سائقون، 8 دقائق غير ذلك
  const baseEta = nearbyDrivers > 0 ? 3 : 8;

  const computedClasses = classes.map((c) => {
    const vehicleClass = { name: c.name, multiplier: c.multiplier };
    const breakdown = computeFare(
      rule,
      distance,
      duration,
      0,
      surge,
      { name: "", multiplier: 1 },
      vehicleClass,
      [],
    );
    return {
      key: c.key,
      name: c.name,
      capacity: c.capacity,
      fare: breakdown.total,
      breakdown: {
        base: breakdown.baseFare,
        distance: breakdown.distanceCost,
        time: breakdown.timeCost,
        bookingFee: breakdown.bookingFee,
        tax: breakdown.tax,
        surge: breakdown.surgeAmount,
        classAmount: breakdown.classAmount,
      },
      eta: baseEta + classes.indexOf(c), // فروقات صغيرة بين الفئات
      currency: rule.currency,
    };
  });

  return okV1({
    distance,
    duration,
    classes: computedClasses,
    surge: {
      active: surge.multiplier > 1,
      multiplier: surge.multiplier,
      name: surge.name,
    },
    cancellationFee: rule.cancellationFee,
    nearbyDrivers,
  });
}
