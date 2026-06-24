import { prisma } from "@/lib/prisma";
import { requireModule, ok } from "@/lib/api-helpers";
import { computeDynamicSurge } from "@/lib/pricing";

/** مؤشّر الطلب اللحظي + مضاعف الذروة الديناميكي الحالي */
export async function GET() {
  const auth = await requireModule("pricing");
  if ("error" in auth) return auth.error;

  const [onlineDrivers, demand] = await Promise.all([
    prisma.driver.count({ where: { available: true, status: "approved" } }),
    prisma.trip.count({ where: { status: "pending" } }),
  ]);
  const dynamic = computeDynamicSurge(onlineDrivers, demand);

  return ok({ onlineDrivers, demand, ratio: dynamic.ratio, multiplier: dynamic.multiplier });
}
