import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, parseListParams, buildMeta } from "@/lib/api-helpers";

/** GET /api/inspections — قائمة فحوصات المركبات + إحصائيات */
export async function GET(req: NextRequest) {
  const auth = await requireModule("vehicles");
  if ("error" in auth) return auth.error;

  const { page, perPage, search, status, type, skip } = parseListParams(req.url);

  const where: any = {};
  if (search) {
    where.driver = { is: { OR: [{ name: { contains: search } }, { plateNumber: { contains: search } }] } };
  }
  if (status) where.status = status;
  if (type) where.type = type;

  const [total, inspections, submittedCount, approvedCount, flaggedCount, damageAgg] = await Promise.all([
    prisma.vehicleInspection.count({ where }),
    prisma.vehicleInspection.findMany({
      where,
      skip,
      take: perPage,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        driver: { select: { id: true, name: true, carMake: true, carModel: true, plateNumber: true } },
      },
    }),
    prisma.vehicleInspection.count({ where: { status: "submitted" } }),
    prisma.vehicleInspection.count({ where: { status: "approved" } }),
    prisma.vehicleInspection.count({ where: { status: "flagged" } }),
    prisma.vehicleInspection.aggregate({ _avg: { damageScore: true } }),
  ]);

  return ok(
    {
      inspections,
      submittedCount,
      approvedCount,
      flaggedCount,
      avgDamage: Math.round(damageAgg._avg.damageScore || 0),
    },
    buildMeta(total, page, perPage)
  );
}
