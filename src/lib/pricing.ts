// ===== محرّك التسعير (يُستخدم في الـ API والحاسبة) — نموذج شبيه بـ Uber =====

export interface PricingRuleShape {
  baseFare: number;
  bookingFee: number;
  perKm: number;
  perMinute: number;
  waitPerMinute: number;
  freeWaitMinutes: number;
  minimumFare: number;
  taxPercent: number;
  distanceUnit: string;
  currency: string;
}

export interface SurgeRuleShape {
  name: string;
  days: string; // "0,1,2,3,4,5,6"
  startHour: number;
  endHour: number;
  multiplier: number;
  active: boolean;
}

export interface ZoneShape {
  name: string;
  multiplier: number;
}

export interface ClassShape {
  name: string;
  multiplier: number;
}

export interface ExtraShape {
  name: string;
  amount: number;
}

export interface FareBreakdown {
  baseFare: number;
  bookingFee: number;
  distanceCost: number;
  timeCost: number;
  waitCost: number;
  meteredBase: number; // قبل المنطقة والفئة
  zoneMultiplier: number;
  zoneName: string | null;
  zoneAmount: number;
  classMultiplier: number;
  className: string | null;
  classAmount: number;
  metered: number; // بعد المنطقة والفئة — الجزء الخاضع للذروة
  surgeMultiplier: number;
  surgeName: string | null;
  surgeSource: "scheduled" | "dynamic" | null;
  surgeAmount: number;
  afterSurge: number;
  minimumApplied: boolean;
  extras: ExtraShape[];
  extrasTotal: number;
  beforeTax: number;
  taxPercent: number;
  tax: number;
  total: number;
  currency: string;
  distanceUnit: string;
}

const round = (n: number) => Math.round(n * 100) / 100;

export interface PromoShape {
  type: string; // percentage | fixed
  value: number;
  maxDiscount?: number | null;
}

/** حساب خصم الكوبون على الإجمالي */
export function computeDiscount(total: number, promo: PromoShape): number {
  let discount = promo.type === "percentage" ? (total * promo.value) / 100 : promo.value;
  if (promo.type === "percentage" && promo.maxDiscount) discount = Math.min(discount, promo.maxDiscount);
  discount = Math.min(discount, total);
  return round(discount);
}

/** المسافة بالكيلومترات بين نقطتين (Haversine — خط مستقيم/هوائي) */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// معامل تقريبي لتحويل المسافة الهوائية إلى مسافة طريق فعلية (متوسط حضري ~1.3)
export const ROAD_DISTANCE_FACTOR = Number(process.env.ROAD_DISTANCE_FACTOR || "1.3");

/**
 * مسافة الطريق الفعلية (نقطة 5): تستخدم OSRM إن ضُبط OSRM_URL، وإلا تقريب = الهوائية × المعامل.
 * (تجنّب احتساب المسافة كخط مستقيم في الفواتير وتتبّع الشكاوى).
 */
export async function roadDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): Promise<{ km: number; source: "osrm" | "approx" }> {
  const base = haversineKm(lat1, lng1, lat2, lng2);
  const osrm = process.env.OSRM_URL; // مثال: https://router.project-osrm.org
  if (osrm) {
    try {
      const url = `${osrm}/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const j: any = await res.json();
        const meters = j?.routes?.[0]?.distance;
        if (typeof meters === "number" && meters > 0) {
          return { km: Math.round((meters / 1000) * 100) / 100, source: "osrm" };
        }
      }
    } catch {
      // عند الفشل نرجع للتقريب
    }
  }
  return { km: Math.round(base * ROAD_DISTANCE_FACTOR * 100) / 100, source: "approx" };
}

/** الذروة المجدولة: أعلى مضاعف لقاعدة مطابقة لليوم/الساعة */
export function resolveSurge(
  rules: SurgeRuleShape[],
  day: number,
  hour: number
): { multiplier: number; name: string | null } {
  let best = { multiplier: 1, name: null as string | null };
  for (const r of rules) {
    if (!r.active) continue;
    const days = r.days.split(",").map((d) => parseInt(d.trim(), 10));
    if (!days.includes(day)) continue;
    if (hour < r.startHour || hour >= r.endHour) continue;
    if (r.multiplier > best.multiplier) best = { multiplier: r.multiplier, name: r.name };
  }
  return best;
}

/**
 * الذروة الديناميكية: تُحسب من نسبة الطلب/العرض اللحظي
 * (طلبات بانتظار سائق ÷ السائقين المتاحين).
 */
export function computeDynamicSurge(
  onlineDrivers: number,
  demand: number
): { multiplier: number; ratio: number } {
  const ratio = demand / Math.max(onlineDrivers, 1);
  let multiplier = 1;
  if (ratio >= 2) multiplier = 2.0;
  else if (ratio >= 1.5) multiplier = 1.8;
  else if (ratio >= 1) multiplier = 1.5;
  else if (ratio >= 0.6) multiplier = 1.2;
  else multiplier = 1;
  return { multiplier, ratio: round(ratio) };
}

/**
 * حساب الأجرة (نموذج Uber):
 * 1) الجزء المُعدّاد = أساس + مسافة×سعر + مدة×سعر + انتظار×سعر (بعد الدقائق المجانية)
 * 2) × مضاعف الذروة (مجدولة أو ديناميكية — الأعلى)
 * 3) لا يقل عن الحد الأدنى
 * 4) + رسوم الحجز
 * 5) + الضريبة
 */
export function computeFare(
  rule: PricingRuleShape,
  distance: number,
  duration: number,
  waitMinutes: number,
  surge: { multiplier: number; name: string | null; source: "scheduled" | "dynamic" | null },
  zone: ZoneShape = { name: "", multiplier: 1 },
  vehicleClass: ClassShape = { name: "", multiplier: 1 },
  extras: ExtraShape[] = []
): FareBreakdown {
  const distanceCost = round(rule.perKm * distance);
  const timeCost = round(rule.perMinute * duration);
  const billableWait = Math.max(0, waitMinutes - rule.freeWaitMinutes);
  const waitCost = round(rule.waitPerMinute * billableWait);

  // 1) الجزء المُعدّاد
  const meteredBase = round(rule.baseFare + distanceCost + timeCost + waitCost);
  // 2) معامل المنطقة
  const afterZone = round(meteredBase * zone.multiplier);
  const zoneAmount = round(afterZone - meteredBase);
  // 3) فئة المركبة (UberX/XL/Black)
  const metered = round(afterZone * vehicleClass.multiplier);
  const classAmount = round(metered - afterZone);
  // 4) الذروة
  const surged = round(metered * surge.multiplier);
  const surgeAmount = round(surged - metered);
  // 5) الحد الأدنى
  const afterMinimum = round(Math.max(surged, rule.minimumFare));
  // 6) الرسوم الخاصة
  const extrasTotal = round(extras.reduce((s, e) => s + e.amount, 0));
  // 7) رسوم الحجز ثم الضريبة
  const beforeTax = round(afterMinimum + rule.bookingFee + extrasTotal);
  const tax = round(beforeTax * (rule.taxPercent / 100));
  const total = round(beforeTax + tax);

  return {
    baseFare: round(rule.baseFare),
    bookingFee: round(rule.bookingFee),
    distanceCost,
    timeCost,
    waitCost,
    meteredBase,
    zoneMultiplier: zone.multiplier,
    zoneName: zone.multiplier !== 1 ? zone.name || null : null,
    zoneAmount,
    classMultiplier: vehicleClass.multiplier,
    className: vehicleClass.multiplier !== 1 ? vehicleClass.name || null : null,
    classAmount,
    metered,
    surgeMultiplier: surge.multiplier,
    surgeName: surge.name,
    surgeSource: surge.multiplier > 1 ? surge.source : null,
    surgeAmount,
    afterSurge: afterMinimum,
    minimumApplied: surged < rule.minimumFare,
    extras,
    extrasTotal,
    beforeTax,
    taxPercent: rule.taxPercent,
    tax,
    total,
    currency: rule.currency,
    distanceUnit: rule.distanceUnit,
  };
}
