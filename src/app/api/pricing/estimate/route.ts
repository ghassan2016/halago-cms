import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { computeFare, resolveSurge, computeDynamicSurge, computeDiscount, haversineKm } from "@/lib/pricing";

/**
 * تقدير الأجرة (نموذج Uber كامل).
 * body: { vehicleType, serviceType?, distance, duration, waitMinutes?, day?, hour?,
 *         zoneId?|lat,lng?, classKey?, extraFeeIds?[], promoCode? }
 */
export async function POST(req: NextRequest) {
  const auth = await requireModule("pricing");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const vehicleType = String(body?.vehicleType || "car");
  const serviceType = body?.serviceType === "delivery" ? "delivery" : "ride";
  const distance = Number(body?.distance ?? 0);
  const duration = Number(body?.duration ?? 0);
  const waitMinutes = Number(body?.waitMinutes ?? 0);

  if (!(distance >= 0) || !(duration >= 0)) return fail("المسافة والمدة مطلوبتان", 422);

  const rule = await prisma.pricingRule.findUnique({
    where: { vehicleType_serviceType: { vehicleType, serviceType } },
  });
  if (!rule) return fail("لا توجد قاعدة تسعير لهذا النوع", 404);

  const now = new Date();
  const day = body?.day !== undefined ? Number(body.day) : now.getDay();
  const hour = body?.hour !== undefined ? Number(body.hour) : now.getHours();

  // الذروة المجدولة + الديناميكية
  const surgeRules = await prisma.surgeRule.findMany({ where: { active: true } });
  const scheduled = resolveSurge(surgeRules, day, hour);
  const [onlineDrivers, demand] = await Promise.all([
    prisma.driver.count({ where: { available: true, status: "approved" } }),
    prisma.trip.count({ where: { status: "pending" } }),
  ]);
  const dynamic = computeDynamicSurge(onlineDrivers, demand);
  const useDynamic = dynamic.multiplier > scheduled.multiplier;
  const surge = useDynamic
    ? { multiplier: dynamic.multiplier, name: "طلب مرتفع", source: "dynamic" as const }
    : { multiplier: scheduled.multiplier, name: scheduled.name, source: "scheduled" as const };

  // المنطقة (بالـ id أو الإحداثيات)
  let zone = { name: "", multiplier: 1 };
  let resolvedZoneId: number | null = null;
  if (body?.zoneId) {
    const z = await prisma.zone.findUnique({ where: { id: Number(body.zoneId) } });
    if (z && z.active) {
      zone = { name: z.name, multiplier: z.priceMultiplier };
      resolvedZoneId = z.id;
    }
  } else if (body?.lat !== undefined && body?.lng !== undefined) {
    const zones = await prisma.zone.findMany({ where: { active: true } });
    let best: { id: number; name: string; multiplier: number; dist: number } | null = null;
    for (const z of zones) {
      const d = haversineKm(Number(body.lat), Number(body.lng), z.centerLat, z.centerLng);
      if (d <= z.radiusKm && (!best || d < best.dist)) best = { id: z.id, name: z.name, multiplier: z.priceMultiplier, dist: d };
    }
    if (best) {
      zone = { name: best.name, multiplier: best.multiplier };
      resolvedZoneId = best.id;
    }
  }

  // فئة المركبة
  let vehicleClass = { name: "", multiplier: 1 };
  if (body?.classKey) {
    const c = await prisma.vehicleClass.findUnique({ where: { key: String(body.classKey) } });
    if (c && c.active) vehicleClass = { name: c.name, multiplier: c.multiplier };
  }

  // الرسوم الخاصة: المختارة يدوياً + الرسوم الجغرافية لمنطقة الانطلاق تلقائياً (نقطة 24)
  const extrasMap = new Map<number, { name: string; amount: number }>();
  if (Array.isArray(body?.extraFeeIds) && body.extraFeeIds.length) {
    const fees = await prisma.extraFee.findMany({
      where: { id: { in: body.extraFeeIds.map((x: any) => Number(x)) }, active: true },
    });
    fees.forEach((f) => extrasMap.set(f.id, { name: f.name, amount: f.amount }));
  }
  if (resolvedZoneId) {
    const zoneFees = await prisma.extraFee.findMany({
      where: { scope: "zone", zoneId: resolvedZoneId, active: true },
    });
    zoneFees.forEach((f) => extrasMap.set(f.id, { name: f.name, amount: f.amount }));
  }
  const extras = Array.from(extrasMap.values());

  const breakdown = computeFare(rule, distance, duration, waitMinutes, surge, zone, vehicleClass, extras);

  // الكوبون
  let discount = 0;
  let promoApplied = false;
  let promoError: string | null = null;
  let promoCode: string | null = null;
  if (body?.promoCode) {
    const code = String(body.promoCode).trim().toUpperCase();
    const promo = await prisma.promo.findUnique({ where: { code } });
    if (!promo) promoError = "كوبون غير موجود";
    else if (promo.status !== "active") promoError = "الكوبون غير مفعّل";
    else if (new Date(promo.validTo) < now) promoError = "انتهت صلاحية الكوبون";
    else if (promo.usedCount >= promo.usageLimit) promoError = "استُنفد عدد مرات استخدام الكوبون";
    else if (promo.service !== "all" && promo.service !== serviceType) promoError = "الكوبون لا ينطبق على هذه الخدمة";
    else if (breakdown.total < promo.minOrder) promoError = `الحد الأدنى للطلب ${promo.minOrder}`;
    else {
      discount = computeDiscount(breakdown.total, { type: promo.type, value: promo.value, maxDiscount: promo.maxDiscount });
      promoApplied = true;
      promoCode = code;
    }
  }

  const finalTotal = Math.round((breakdown.total - discount) * 100) / 100;

  return ok({
    ...breakdown,
    finalTotal,
    discount,
    promoApplied,
    promoError,
    promoCode,
    vehicleType,
    serviceType,
    distance,
    duration,
    waitMinutes,
    day,
    hour,
    cancellationFee: rule.cancellationFee,
    scheduledMultiplier: scheduled.multiplier,
    dynamicMultiplier: dynamic.multiplier,
    demandRatio: dynamic.ratio,
    onlineDrivers,
    demand,
  });
}
