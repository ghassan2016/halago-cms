import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok } from "@/lib/api-helpers";

/** GET /api/heatmap — نقاط الالتقاط لخريطة الطلب الحرارية */
export async function GET(req: NextRequest) {
  const auth = await requireModule("heatmap");
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const range = (url.searchParams.get("range") || "week").toLowerCase();

  const now = Date.now();
  const since: Date | null =
    range === "day"
      ? new Date(now - 86400_000)
      : range === "week"
      ? new Date(now - 7 * 86400_000)
      : range === "month"
      ? new Date(now - 30 * 86400_000)
      : null;

  const where: any = {
    pickupLat: { not: null },
    pickupLng: { not: null },
    status: { in: ["completed", "in_progress", "accepted", "arrived"] },
  };
  if (since) where.createdAt = { gte: since };

  const trips = await prisma.trip.findMany({
    where,
    select: { pickupLat: true, pickupLng: true, city: true },
    take: 5000, // حد أعلى لمنع تضخّم الردّ
  });

  // تجميع النقاط على شبكة ~1km لتقدير الكثافة
  const buckets = new Map<string, { lat: number; lng: number; count: number }>();
  const cityCounts = new Map<string, number>();
  const round = (v: number) => Math.round(v * 100) / 100; // ~1.1km

  for (const t of trips) {
    if (t.pickupLat == null || t.pickupLng == null) continue;
    const lat = round(t.pickupLat);
    const lng = round(t.pickupLng);
    const key = `${lat},${lng}`;
    const b = buckets.get(key);
    if (b) b.count += 1;
    else buckets.set(key, { lat, lng, count: 1 });

    if (t.city) cityCounts.set(t.city, (cityCounts.get(t.city) || 0) + 1);
  }

  // الوزن نسبيّ — نقسم على أعلى قيمة لنحصل على 0..1
  const maxCount = Math.max(1, ...Array.from(buckets.values()).map((b) => b.count));
  const points = Array.from(buckets.values()).map((b) => ({
    lat: b.lat,
    lng: b.lng,
    weight: Number((b.count / maxCount).toFixed(3)),
  }));

  const cities = Array.from(cityCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // ===== طبقة العرض الآني: السائقون المتاحون + الطلب الحالي (نقطة 1) =====
  // أزمة سيارات = طلب مرتفع وعرض منخفض → اقتراح ضرب الأسعار في تلك المنطقة.
  const [availableDrivers, pendingTrips] = await Promise.all([
    prisma.driver.findMany({
      where: { available: true, status: "approved", lat: { not: null }, lng: { not: null } },
      select: { lat: true, lng: true, city: true },
      take: 2000,
    }),
    prisma.trip.findMany({
      where: { status: "pending", pickupLat: { not: null } },
      select: { city: true },
      take: 5000,
    }),
  ]);

  const driverPoints = availableDrivers
    .filter((d) => d.lat != null && d.lng != null)
    .map((d) => ({ lat: d.lat as number, lng: d.lng as number }));

  // نسبة الطلب/العرض لكل مدينة + اقتراح مضاعِف الذروة
  const supplyByCity = new Map<string, number>();
  for (const d of availableDrivers) if (d.city) supplyByCity.set(d.city, (supplyByCity.get(d.city) || 0) + 1);
  const demandByCity = new Map<string, number>();
  for (const p of pendingTrips) if (p.city) demandByCity.set(p.city, (demandByCity.get(p.city) || 0) + 1);

  const allCityNames = new Set(Array.from(supplyByCity.keys()).concat(Array.from(demandByCity.keys())));
  const demandSupply = Array.from(allCityNames)
    .map((name) => {
      const demand = demandByCity.get(name) || 0;
      const supply = supplyByCity.get(name) || 0;
      const ratio = demand / Math.max(supply, 1);
      // مضاعِف مقترح بناءً على نسبة النقص
      let suggestedSurge = 1;
      if (ratio >= 2) suggestedSurge = 2;
      else if (ratio >= 1.5) suggestedSurge = 1.8;
      else if (ratio >= 1) suggestedSurge = 1.5;
      else if (ratio >= 0.6) suggestedSurge = 1.2;
      const shortage = demand > supply && demand > 0;
      return { name, demand, supply, ratio: Number(ratio.toFixed(2)), suggestedSurge, shortage };
    })
    .sort((a, b) => b.ratio - a.ratio);

  return ok({
    points,
    driverPoints,
    cities,
    demandSupply,
    shortageCities: demandSupply.filter((c) => c.shortage),
    onlineDrivers: availableDrivers.length,
    openDemand: pendingTrips.length,
    total: trips.length,
    topCity: cities[0] ?? null,
  });
}
