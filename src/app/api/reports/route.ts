import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok } from "@/lib/api-helpers";

/** GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD — تحليلات الأداء بنطاق تاريخ */
export async function GET(req: NextRequest) {
  const auth = await requireModule("reports");
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const from = fromParam ? new Date(fromParam) : null;
  const to = toParam ? new Date(toParam) : null;
  if (to) to.setHours(23, 59, 59, 999);

  const tripsWhere: any = { status: "completed" };
  if (from || to) tripsWhere.createdAt = {};
  if (from) tripsWhere.createdAt.gte = from;
  if (to) tripsWhere.createdAt.lte = to;

  // أعلى السائقين أداءً (مفلتر بنطاق الرحلات إن وُجد)
  const driverPerf = await prisma.trip.groupBy({
    by: ["driverId"],
    where: { ...tripsWhere, driverId: { not: null } },
    _count: { _all: true },
    _sum: { commission: true, fare: true },
    orderBy: { _count: { driverId: "desc" } },
    take: 12,
  });
  const driverIds = driverPerf.map((d) => d.driverId!).filter(Boolean) as number[];
  const drivers = await prisma.driver.findMany({
    where: { id: { in: driverIds } },
    select: { id: true, name: true, rating: true, walletBalance: true, city: true },
  });
  const driverMap = new Map(drivers.map((d) => [d.id, d]));
  const topDrivers = driverPerf
    .map((d) => {
      const info = driverMap.get(d.driverId!);
      if (!info) return null;
      return {
        id: info.id,
        name: info.name,
        totalTrips: d._count._all,
        rating: info.rating,
        walletBalance: info.walletBalance,
        revenue: Number((d._sum.fare || 0).toFixed(2)),
      };
    })
    .filter(Boolean) as any[];

  // الرحلات حسب المدينة (في النطاق)
  const tripsByCityRaw = await prisma.trip.groupBy({
    by: ["city"],
    where: { ...tripsWhere },
    _count: { _all: true },
  });
  const tripsByCity = tripsByCityRaw
    .map((r) => ({ city: r.city || "—", count: r._count._all }))
    .sort((a, b) => b.count - a.count);

  // الإيراد حسب نوع الخدمة (في النطاق)
  const [rideAgg, deliveryAgg] = await Promise.all([
    prisma.trip.aggregate({ _sum: { commission: true }, where: { ...tripsWhere, type: "ride" } }),
    prisma.trip.aggregate({ _sum: { commission: true }, where: { ...tripsWhere, type: "delivery" } }),
  ]);
  const revenueByType = [
    { name: "ride", value: Number((rideAgg._sum.commission || 0).toFixed(2)) },
    { name: "delivery", value: Number((deliveryAgg._sum.commission || 0).toFixed(2)) },
  ];

  // إجماليات النطاق
  const [tripsTotal, completedTotal, revenueAgg, customerCount, newCustomers] = await Promise.all([
    prisma.trip.count({ where: from || to ? { createdAt: tripsWhere.createdAt } : {} }),
    prisma.trip.count({ where: tripsWhere }),
    prisma.trip.aggregate({ where: tripsWhere, _sum: { commission: true, fare: true } }),
    prisma.customer.count(),
    prisma.customer.count({ where: from || to ? { createdAt: tripsWhere.createdAt } : {} }),
  ]);

  // عدد السائقين حسب المدينة (مرجعي، غير مفلتر بالنطاق)
  const byCityRaw = await prisma.driver.groupBy({ by: ["city"], _count: { _all: true } });
  const driversByCity = byCityRaw
    .map((r) => ({ city: r.city || "—", count: r._count._all }))
    .sort((a, b) => b.count - a.count);

  return ok({
    range: { from: from?.toISOString() || null, to: to?.toISOString() || null },
    totals: {
      tripsTotal,
      completedTotal,
      cancellationRate: tripsTotal ? Number(((1 - completedTotal / tripsTotal) * 100).toFixed(1)) : 0,
      totalRevenue: Number((revenueAgg._sum.commission || 0).toFixed(2)),
      totalFare: Number((revenueAgg._sum.fare || 0).toFixed(2)),
      customers: customerCount,
      newCustomers,
    },
    topDrivers,
    driversByCity,
    tripsByCity,
    revenueByType,
  });
}
