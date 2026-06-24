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

  return ok({
    points,
    cities,
    total: trips.length,
    topCity: cities[0] ?? null,
  });
}
