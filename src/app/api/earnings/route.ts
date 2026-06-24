import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok } from "@/lib/api-helpers";

/** GET /api/earnings?range=week|month|all — أرباح السائقين الإجمالية + لكل سائق */
export async function GET(req: NextRequest) {
  const auth = await requireModule("earnings");
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const range = (url.searchParams.get("range") || "month").toLowerCase();
  const search = (url.searchParams.get("search") || "").trim();
  const now = Date.now();
  const since: Date | null =
    range === "week" ? new Date(now - 7 * 86400_000)
    : range === "month" ? new Date(now - 30 * 86400_000)
    : null;

  const tripWhere: any = { status: "completed", driverId: { not: null } };
  if (since) tripWhere.createdAt = { gte: since };

  // تجميع الرحلات المكتملة لكل سائق
  const tripsAgg = await prisma.trip.groupBy({
    by: ["driverId"],
    where: tripWhere,
    _count: { _all: true },
    _sum: { fare: true, commission: true },
  });
  const driverIds = tripsAgg.map((r) => r.driverId!).filter(Boolean) as number[];

  // المسحوبات المعتمدة في نفس الفترة
  const payoutWhere: any = { status: "approved", driverId: { in: driverIds } };
  if (since) payoutWhere.createdAt = { gte: since };
  const payoutsAgg = await prisma.withdrawalRequest.groupBy({
    by: ["driverId"],
    where: payoutWhere,
    _sum: { amount: true },
  });
  const payoutMap = new Map<number, number>();
  payoutsAgg.forEach((p) => payoutMap.set(p.driverId, p._sum.amount || 0));

  // معلومات السائق
  const driversWhere: any = { id: { in: driverIds } };
  if (search) driversWhere.name = { contains: search };
  const drivers = await prisma.driver.findMany({
    where: driversWhere,
    select: { id: true, name: true, walletBalance: true, rating: true, totalTrips: true, city: true, vehicleType: true },
  });
  const driverMap = new Map(drivers.map((d) => [d.id, d]));

  // تركيب الصفوف (المرشَّحون بالبحث فقط)
  const rows = tripsAgg
    .map((r) => {
      const d = driverMap.get(r.driverId!);
      if (!d) return null;
      const gross = r._sum.fare || 0;
      const commission = r._sum.commission || 0;
      const net = Number((gross - commission).toFixed(2));
      const payouts = payoutMap.get(r.driverId!) || 0;
      return {
        driverId: r.driverId!,
        driverName: d.name,
        city: d.city,
        vehicleType: d.vehicleType,
        rating: d.rating,
        completedTrips: r._count._all,
        gross: Number(gross.toFixed(2)),
        commission: Number(commission.toFixed(2)),
        net,
        payouts: Number(payouts.toFixed(2)),
        balance: d.walletBalance,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.net - a.net) as any[];

  const totals = {
    totalEarnings: Number(rows.reduce((s, r) => s + r.gross, 0).toFixed(2)),
    totalCommission: Number(rows.reduce((s, r) => s + r.commission, 0).toFixed(2)),
    totalPayouts: Number(rows.reduce((s, r) => s + r.payouts, 0).toFixed(2)),
    avgEarnings: rows.length ? Number((rows.reduce((s, r) => s + r.net, 0) / rows.length).toFixed(2)) : 0,
    driversCount: rows.length,
  };

  return ok({
    totals,
    rows,
    top: rows.slice(0, 5),
  });
}
