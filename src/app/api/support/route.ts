import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, parseListParams, buildMeta } from "@/lib/api-helpers";

/** GET /api/support — قائمة تذاكر الدعم */
export async function GET(req: NextRequest) {
  const auth = await requireModule("support");
  if ("error" in auth) return auth.error;

  const { page, perPage, search, status, skip } = parseListParams(req.url);
  const url = new URL(req.url);
  const priority = url.searchParams.get("priority") || "";
  const mine = url.searchParams.get("mine") === "true";

  const where: any = {};
  if (search) {
    where.OR = [
      { number: { contains: search } },
      { subject: { contains: search } },
      { reporterName: { contains: search } },
      { reporterPhone: { contains: search } },
      { reporterEmail: { contains: search } },
      { tripNumber: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (mine && auth.session?.sub) {
    where.assigneeId = Number(auth.session.sub);
  }

  const [total, tickets, openCount, urgentCount] = await Promise.all([
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.findMany({
      where,
      skip,
      take: perPage,
      orderBy: [
        { status: "asc" },
        { priority: "desc" },
        { createdAt: "desc" },
      ],
    }),
    prisma.supportTicket.count({ where: { status: { in: ["open", "in_progress", "waiting_user"] } } }),
    prisma.supportTicket.count({
      where: { status: { in: ["open", "in_progress"] }, priority: "urgent" },
    }),
  ]);

  return ok({ tickets, openCount, urgentCount }, buildMeta(total, page, perPage));
}
