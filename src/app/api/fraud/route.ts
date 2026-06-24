import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, parseListParams, buildMeta } from "@/lib/api-helpers";

/** GET /api/fraud — قائمة علامات الاحتيال + إحصائيات */
export async function GET(req: NextRequest) {
  const auth = await requireModule("fraud");
  if ("error" in auth) return auth.error;

  const { page, perPage, search, status, skip } = parseListParams(req.url);
  const url = new URL(req.url);
  const severity = url.searchParams.get("severity") || "";
  const subjectType = url.searchParams.get("subjectType") || "";
  const reason = url.searchParams.get("reason") || "";

  const where: any = {};
  if (search) {
    where.OR = [
      { subjectRef: { contains: search } },
      { reason: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (severity) where.severity = severity;
  if (subjectType) where.subjectType = subjectType;
  if (reason) where.reason = reason;

  const [total, flags, openCount, highCount, confirmedCount] = await Promise.all([
    prisma.fraudFlag.count({ where }),
    prisma.fraudFlag.findMany({
      where,
      skip,
      take: perPage,
      orderBy: [{ status: "asc" }, { score: "desc" }, { createdAt: "desc" }],
    }),
    prisma.fraudFlag.count({ where: { status: { in: ["open", "reviewing"] } } }),
    prisma.fraudFlag.count({ where: { severity: "high", status: { in: ["open", "reviewing"] } } }),
    prisma.fraudFlag.count({ where: { status: "confirmed" } }),
  ]);

  return ok({ flags, openCount, highCount, confirmedCount }, buildMeta(total, page, perPage));
}
