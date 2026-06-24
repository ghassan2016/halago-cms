import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, parseListParams, buildMeta } from "@/lib/api-helpers";

/** GET /api/sos — قائمة تنبيهات الطوارئ (مع البحث والترقيم وفلتر الحالة) */
export async function GET(req: NextRequest) {
  const auth = await requireModule("sos");
  if ("error" in auth) return auth.error;

  const { page, perPage, search, status, skip } = parseListParams(req.url);
  const url = new URL(req.url);
  const severity = url.searchParams.get("severity") || "";
  const reason = url.searchParams.get("reason") || "";

  const where: any = {};
  if (search) {
    where.OR = [
      { reporterName: { contains: search } },
      { reporterPhone: { contains: search } },
      { tripNumber: { contains: search } },
      { city: { contains: search } },
      { reason: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (severity) where.severity = severity;
  if (reason) where.reason = reason;

  const [total, alerts, openCount, criticalCount] = await Promise.all([
    prisma.sosAlert.count({ where }),
    prisma.sosAlert.findMany({
      where,
      skip,
      take: perPage,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.sosAlert.count({ where: { status: "open" } }),
    prisma.sosAlert.count({ where: { status: { in: ["open", "in_progress"] }, severity: "critical" } }),
  ]);

  return ok(
    { alerts, openCount, criticalCount },
    buildMeta(total, page, perPage)
  );
}
