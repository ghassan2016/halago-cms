import { prisma } from "@/lib/prisma";
import { requireModule, ok } from "@/lib/api-helpers";

/**
 * GET /api/dispatch — لوحة الإرسال اللحظية:
 *  - رحلات pending/accepted بانتظار سائق
 *  - سائقون متاحون (approved + available) مع إحداثياتهم
 *  - عدّادات سريعة
 */
export async function GET() {
  const auth = await requireModule("dispatch");
  if ("error" in auth) return auth.error;

  const [waitingTrips, availableDrivers, busyCount, scheduledNextHour] = await Promise.all([
    prisma.trip.findMany({
      where: {
        status: { in: ["pending", "accepted"] },
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date(Date.now() + 30 * 60_000) } }],
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        driver: { select: { id: true, name: true, phone: true, vehicleType: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 50,
    }),
    prisma.driver.findMany({
      where: { status: "approved", available: true, lat: { not: null }, lng: { not: null } },
      select: {
        id: true,
        name: true,
        phone: true,
        vehicleType: true,
        rating: true,
        city: true,
        lat: true,
        lng: true,
      },
      take: 200,
    }),
    prisma.trip.count({ where: { status: { in: ["in_progress", "arrived"] } } }),
    prisma.trip.count({
      where: {
        scheduledAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 60 * 60_000),
        },
      },
    }),
  ]);

  return ok({
    waitingTrips,
    availableDrivers,
    stats: {
      waiting: waitingTrips.length,
      available: availableDrivers.length,
      busy: busyCount,
      scheduledSoon: scheduledNextHour,
    },
  });
}
