import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ERRORS, okV1, requireV1Auth } from "@/lib/v1/api";

export async function POST(req: NextRequest) {
  const auth = await requireV1Auth(req, { role: "driver" });
  if ("error" in auth) return auth.error;

  const shift = await prisma.driverShift.findFirst({
    where: { driverId: auth.session.userId, status: "active" },
    orderBy: { startedAt: "desc" },
  });
  if (!shift) {
    // لا وردية مفتوحة — فقط نتأكّد من available=false
    await prisma.driver.update({
      where: { id: auth.session.userId },
      data: { available: false },
    });
    return okV1({ ended: true, shiftId: null });
  }

  const now = new Date();
  const durationMin = Math.max(
    0,
    Math.floor((now.getTime() - shift.startedAt.getTime()) / 60000),
  );

  // إحصائيات الوردية من الرحلات
  const tripsInShift = await prisma.trip.findMany({
    where: {
      driverId: auth.session.userId,
      createdAt: { gte: shift.startedAt },
    },
  });
  const completed = tripsInShift.filter((t) => t.status === "completed");
  const cancelled = tripsInShift.filter((t) => t.status === "cancelled");
  const totalKm = completed.reduce((s, t) => s + t.distance, 0);
  const totalEarnings = completed.reduce(
    (s, t) => s + (t.fare - t.commission),
    0,
  );

  const updated = await prisma.driverShift.update({
    where: { id: shift.id },
    data: {
      status: "ended",
      endedAt: now,
      durationMin,
      totalTrips: tripsInShift.length,
      completedTrips: completed.length,
      cancelledTrips: cancelled.length,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalKm: Math.round(totalKm * 100) / 100,
    },
  });

  await prisma.driver.update({
    where: { id: auth.session.userId },
    data: { available: false },
  });

  return okV1({
    ended: true,
    shiftId: String(updated.id),
    durationMin: updated.durationMin,
    totalTrips: updated.totalTrips,
    completedTrips: updated.completedTrips,
    cancelledTrips: updated.cancelledTrips,
    totalEarnings: updated.totalEarnings,
    totalKm: updated.totalKm,
  });
}
