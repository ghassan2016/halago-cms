// محرّك heuristic لكشف الأنماط المريبة في المنصة.
// يعمل كمسح دفعي (batch scan) من /api/fraud/scan ويُولّد FraudFlag rows.

import { prisma } from "@/lib/prisma";

export type FraudReason =
  | "high_cancel_rate"
  | "gps_jump"
  | "duplicate_phone"
  | "impossible_speed"
  | "rating_streak"
  | "refund_abuse"
  | "multi_account";

export interface FraudCandidate {
  subjectType: "driver" | "customer" | "trip";
  subjectId: number;
  subjectRef: string;
  reason: FraudReason;
  score: number; // 0-100
  severity: "low" | "medium" | "high";
  evidence: Record<string, unknown>;
}

const HORIZON_DAYS = 7;
const horizon = () => new Date(Date.now() - HORIZON_DAYS * 86400_000);

/** سائق نسبة إلغاءاته > 30% خلال أسبوع (>=5 رحلات) */
async function detectDriverCancellations(): Promise<FraudCandidate[]> {
  const trips = await prisma.trip.groupBy({
    by: ["driverId", "status"],
    where: { driverId: { not: null }, createdAt: { gte: horizon() } },
    _count: { _all: true },
  });
  const acc = new Map<number, { total: number; cancelled: number }>();
  for (const t of trips) {
    if (!t.driverId) continue;
    const cur = acc.get(t.driverId) || { total: 0, cancelled: 0 };
    cur.total += t._count._all;
    if (t.status === "cancelled") cur.cancelled += t._count._all;
    acc.set(t.driverId, cur);
  }
  const out: FraudCandidate[] = [];
  for (const [driverId, s] of Array.from(acc)) {
    if (s.total < 5) continue;
    const rate = s.cancelled / s.total;
    if (rate <= 0.3) continue;
    const driver = await prisma.driver.findUnique({ where: { id: driverId }, select: { name: true } });
    out.push({
      subjectType: "driver",
      subjectId: driverId,
      subjectRef: driver?.name || `Driver #${driverId}`,
      reason: "high_cancel_rate",
      score: Math.min(100, Math.round(rate * 100) + 20),
      severity: rate > 0.5 ? "high" : "medium",
      evidence: { window_days: HORIZON_DAYS, total_trips: s.total, cancelled: s.cancelled, cancel_rate: Number(rate.toFixed(3)) },
    });
  }
  return out;
}

/** سائق آخر 5 تقييمات كلّها <= 2 (انخفاض حاد متواصل) */
async function detectDriverRatingStreak(): Promise<FraudCandidate[]> {
  const drivers = await prisma.driver.findMany({ where: { status: "approved" }, select: { id: true, name: true } });
  const out: FraudCandidate[] = [];
  for (const d of drivers) {
    const last5 = await prisma.trip.findMany({
      where: { driverId: d.id, status: "completed", rating: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { rating: true },
    });
    if (last5.length < 5) continue;
    if (last5.every((t) => (t.rating ?? 5) <= 2)) {
      out.push({
        subjectType: "driver",
        subjectId: d.id,
        subjectRef: d.name,
        reason: "rating_streak",
        score: 70,
        severity: "high",
        evidence: { last_5_ratings: last5.map((t) => t.rating) },
      });
    }
  }
  return out;
}

/** عميل بأكثر من 3 رحلات ملغاة في يوم واحد */
async function detectCustomerCancellationSpike(): Promise<FraudCandidate[]> {
  const trips = await prisma.trip.findMany({
    where: { customerId: { not: null }, status: "cancelled", createdAt: { gte: horizon() } },
    select: { customerId: true, createdAt: true },
  });
  const buckets = new Map<string, number>();
  for (const t of trips) {
    if (!t.customerId) continue;
    const day = t.createdAt.toISOString().slice(0, 10);
    const k = `${t.customerId}|${day}`;
    buckets.set(k, (buckets.get(k) || 0) + 1);
  }
  const flagged = new Map<number, number>();
  for (const [k, n] of Array.from(buckets)) {
    if (n < 4) continue;
    const cid = Number(k.split("|")[0]);
    flagged.set(cid, Math.max(flagged.get(cid) || 0, n));
  }
  const out: FraudCandidate[] = [];
  for (const [cid, n] of Array.from(flagged)) {
    const c = await prisma.customer.findUnique({ where: { id: cid }, select: { name: true } });
    out.push({
      subjectType: "customer",
      subjectId: cid,
      subjectRef: c?.name || `Customer #${cid}`,
      reason: "high_cancel_rate",
      score: Math.min(100, 40 + n * 10),
      severity: n >= 6 ? "high" : "medium",
      evidence: { window_days: HORIZON_DAYS, max_daily_cancellations: n },
    });
  }
  return out;
}

/** عميل مرتبط برقم هاتف مكرّر عبر حسابات (محاولة multi-account) */
async function detectDuplicatePhones(): Promise<FraudCandidate[]> {
  const dups = await prisma.customer.groupBy({
    by: ["phone"],
    _count: { _all: true },
    having: { phone: { _count: { gt: 1 } } },
  });
  const out: FraudCandidate[] = [];
  for (const d of dups) {
    if (d._count._all < 2) continue;
    const customers = await prisma.customer.findMany({ where: { phone: d.phone }, select: { id: true, name: true } });
    for (const c of customers) {
      out.push({
        subjectType: "customer",
        subjectId: c.id,
        subjectRef: c.name,
        reason: "duplicate_phone",
        score: 80,
        severity: "high",
        evidence: { phone: d.phone, account_count: d._count._all, sibling_ids: customers.filter((x) => x.id !== c.id).map((x) => x.id) },
      });
    }
  }
  return out;
}

/** رحلة سرعتها المتوسّطة > 180 كم/س (إحداثيات/مدة مستحيلة) */
async function detectImpossibleSpeed(): Promise<FraudCandidate[]> {
  const trips = await prisma.trip.findMany({
    where: { status: "completed", duration: { gt: 0 }, distance: { gt: 0 }, createdAt: { gte: horizon() } },
    select: { id: true, number: true, distance: true, duration: true },
    take: 2000,
  });
  const out: FraudCandidate[] = [];
  for (const t of trips) {
    const hours = t.duration / 60;
    if (hours <= 0) continue;
    const speed = t.distance / hours; // km/h
    if (speed < 180) continue;
    out.push({
      subjectType: "trip",
      subjectId: t.id,
      subjectRef: t.number,
      reason: "impossible_speed",
      score: Math.min(100, Math.round(speed / 3)),
      severity: speed > 250 ? "high" : "medium",
      evidence: { distance_km: t.distance, duration_min: t.duration, avg_speed_kmh: Number(speed.toFixed(1)) },
    });
  }
  return out;
}

/** عميل عليه > 2 استرداد خلال أسبوع */
async function detectRefundAbuse(): Promise<FraudCandidate[]> {
  const refunds = await prisma.trip.groupBy({
    by: ["customerId"],
    where: { paymentStatus: "refunded", customerId: { not: null }, createdAt: { gte: horizon() } },
    _count: { _all: true },
  });
  const out: FraudCandidate[] = [];
  for (const r of refunds) {
    if ((r._count._all ?? 0) < 3 || !r.customerId) continue;
    const c = await prisma.customer.findUnique({ where: { id: r.customerId }, select: { name: true } });
    out.push({
      subjectType: "customer",
      subjectId: r.customerId,
      subjectRef: c?.name || `Customer #${r.customerId}`,
      reason: "refund_abuse",
      score: Math.min(100, 50 + r._count._all * 10),
      severity: r._count._all >= 5 ? "high" : "medium",
      evidence: { window_days: HORIZON_DAYS, refund_count: r._count._all },
    });
  }
  return out;
}

/**
 * يشغّل كل القواعد ويُدخل العلامات الجديدة فقط (يتجنّب التكرار خلال نافذة دلتا).
 * يُعيد إحصائيات بسيطة.
 */
export async function runFraudScan() {
  const groups = await Promise.all([
    detectDriverCancellations(),
    detectDriverRatingStreak(),
    detectCustomerCancellationSpike(),
    detectDuplicatePhones(),
    detectImpossibleSpeed(),
    detectRefundAbuse(),
  ]);
  const all = groups.flat();

  // تجنّب تكرار علامة بنفس (subjectType + subjectId + reason) إن كانت مفتوحة
  let created = 0;
  for (const c of all) {
    const exists = await prisma.fraudFlag.findFirst({
      where: {
        subjectType: c.subjectType,
        subjectId: c.subjectId,
        reason: c.reason,
        status: { in: ["open", "reviewing"] },
      },
    });
    if (exists) continue;
    await prisma.fraudFlag.create({
      data: {
        subjectType: c.subjectType,
        subjectId: c.subjectId,
        subjectRef: c.subjectRef,
        reason: c.reason,
        score: c.score,
        severity: c.severity,
        status: "open",
        evidence: JSON.stringify(c.evidence),
      },
    });
    created++;
  }
  return { scanned: all.length, created };
}
