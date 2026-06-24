import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, parseListParams, buildMeta } from "@/lib/api-helpers";

/** GET /api/scheduled — الرحلات المجدولة (المستقبلية فقط) */
export async function GET(req: NextRequest) {
  const auth = await requireModule("scheduled");
  if ("error" in auth) return auth.error;

  const { page, perPage, search, skip } = parseListParams(req.url);
  const url = new URL(req.url);
  const range = (url.searchParams.get("range") || "all").toLowerCase();

  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(now);
  endToday.setHours(23, 59, 59, 999);
  const endWeek = new Date(now.getTime() + 7 * 86400000);

  const where: any = {
    scheduledAt: { gte: now },
    status: { in: ["pending", "accepted"] },
  };
  if (search) {
    where.OR = [
      { number: { contains: search } },
      { pickupAddress: { contains: search } },
      { dropAddress: { contains: search } },
    ];
  }
  if (range === "today") {
    where.scheduledAt = { gte: now, lte: endToday };
  } else if (range === "week") {
    where.scheduledAt = { gte: now, lte: endWeek };
  } else if (range === "unassigned") {
    where.driverId = null;
  }

  const baseScope = { scheduledAt: { gte: now } };

  const [total, trips, todayCount, weekCount, unassignedCount] = await Promise.all([
    prisma.trip.count({ where }),
    prisma.trip.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { scheduledAt: "asc" },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        driver: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.trip.count({ where: { ...baseScope, scheduledAt: { gte: now, lte: endToday } } }),
    prisma.trip.count({ where: { ...baseScope, scheduledAt: { gte: now, lte: endWeek } } }),
    prisma.trip.count({ where: { ...baseScope, driverId: null } }),
  ]);

  return ok(
    { trips, todayCount, weekCount, unassignedCount },
    buildMeta(total, page, perPage)
  );
}
