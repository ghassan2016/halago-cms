import { prisma } from "@/lib/prisma";
import { requireModule, ok } from "@/lib/api-helpers";

export async function GET() {
  const auth = await requireModule("dashboard");
  if ("error" in auth) return auth.error;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    totalDrivers,
    totalTrips,
    onlineDrivers,
    pendingDrivers,
    todayTrips,
    completedTrips,
    earningsAgg,
    todayEarningsAgg,
    recentTrips,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.driver.count(),
    prisma.trip.count(),
    prisma.driver.count({ where: { available: true, status: "approved" } }),
    prisma.driver.count({ where: { status: "pending" } }),
    prisma.trip.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.trip.count({ where: { status: "completed" } }),
    prisma.trip.aggregate({ _sum: { commission: true }, where: { status: "completed" } }),
    prisma.trip.aggregate({
      _sum: { commission: true },
      where: { status: "completed", createdAt: { gte: startOfToday } },
    }),
    prisma.trip.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { name: true } }, driver: { select: { name: true } } },
    }),
  ]);

  // بيانات الرسم البياني — آخر 14 يوماً
  const chart: { date: string; trips: number; earnings: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(startOfToday);
    day.setDate(day.getDate() - i);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const dayTrips = await prisma.trip.findMany({
      where: { createdAt: { gte: day, lt: next } },
      select: { commission: true, status: true },
    });
    chart.push({
      date: day.toISOString().slice(5, 10),
      trips: dayTrips.length,
      earnings: Number(
        dayTrips
          .filter((t) => t.status === "completed")
          .reduce((s, t) => s + t.commission, 0)
          .toFixed(2)
      ),
    });
  }

  // توزيع الرحلات حسب النوع
  const [rideCount, deliveryCount] = await Promise.all([
    prisma.trip.count({ where: { type: "ride" } }),
    prisma.trip.count({ where: { type: "delivery" } }),
  ]);

  // ودجات تشغيلية (SOS / تذاكر دعم / حجوزات اليوم)
  const endOfToday = new Date(startOfToday);
  endOfToday.setHours(23, 59, 59, 999);
  const now = new Date();
  const [sosOpen, supportUrgent, scheduledToday, activeShifts] = await Promise.all([
    prisma.sosAlert.count({ where: { status: { in: ["open", "in_progress"] } } }),
    prisma.supportTicket.count({
      where: { status: { in: ["open", "in_progress"] }, priority: "urgent" },
    }),
    prisma.trip.count({
      where: { scheduledAt: { gte: now, lte: endOfToday }, status: { in: ["pending", "accepted"] } },
    }),
    prisma.driverShift.count({ where: { status: "active" } }),
  ]);

  return ok({
    total_users: totalUsers,
    total_drivers: totalDrivers,
    total_trips: totalTrips,
    total_earnings: Number((earningsAgg._sum.commission || 0).toFixed(2)),
    online_drivers: onlineDrivers,
    pending_drivers: pendingDrivers,
    today_trips: todayTrips,
    today_earnings: Number((todayEarningsAgg._sum.commission || 0).toFixed(2)),
    completed_trips: completedTrips,
    chart,
    type_distribution: [
      { name: "ride", value: rideCount },
      { name: "delivery", value: deliveryCount },
    ],
    recent_trips: recentTrips,
    sos_open: sosOpen,
    support_urgent: supportUrgent,
    scheduled_today: scheduledToday,
    active_shifts: activeShifts,
  });
}
