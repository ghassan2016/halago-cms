import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, parseListParams, buildMeta } from "@/lib/api-helpers";

/** GET /api/shifts — قائمة ورديات السائقين مع إحصائيات */
export async function GET(req: NextRequest) {
  const auth = await requireModule("shifts");
  if ("error" in auth) return auth.error;

  const { page, perPage, search, skip } = parseListParams(req.url);
  const url = new URL(req.url);
  const range = (url.searchParams.get("range") || "all").toLowerCase();

  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);

  const where: any = {};
  if (search) {
    where.driver = { is: { name: { contains: search } } };
  }
  if (range === "active") where.status = "active";
  else if (range === "today") where.startedAt = { gte: startToday };

  const [total, shifts, activeCount, todayShifts] = await Promise.all([
    prisma.driverShift.count({ where }),
    prisma.driverShift.findMany({
      where,
      skip,
      take: perPage,
      orderBy: [{ status: "asc" }, { startedAt: "desc" }],
      include: { driver: { select: { id: true, name: true, phone: true, vehicleType: true, rating: true } } },
    }),
    prisma.driverShift.count({ where: { status: "active" } }),
    prisma.driverShift.findMany({
      where: { startedAt: { gte: startToday } },
      select: { durationMin: true, totalEarnings: true },
    }),
  ]);

  const todayCount = todayShifts.length;
  const avgDuration = todayCount
    ? Math.round(todayShifts.reduce((s, x) => s + (x.durationMin || 0), 0) / todayCount)
    : 0;
  const totalEarnings = todayShifts.reduce((s, x) => s + (x.totalEarnings || 0), 0);

  return ok(
    { shifts, activeCount, todayCount, avgDuration, totalEarnings },
    buildMeta(total, page, perPage)
  );
}
