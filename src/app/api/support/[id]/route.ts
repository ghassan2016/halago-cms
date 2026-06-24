import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

/** GET /api/support/[id] — تفاصيل تذكرة مع كامل المحادثة */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("support");
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) return fail("التذكرة غير موجودة", 404);
  return ok(ticket);
}

/**
 * PATCH /api/support/[id] — تحديث حالة/إسناد/أولوية التذكرة
 * body: { action: "assign"|"close"|"reopen"|"priority"|"status", priority?, status? }
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("support");
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) return fail("التذكرة غير موجودة", 404);

  if (action === "assign") {
    const updated = await prisma.supportTicket.update({
      where: { id },
      data: {
        assigneeId: auth.session?.sub ? Number(auth.session.sub) : null,
        assigneeName: auth.session?.name ?? null,
        status: ticket.status === "open" ? "in_progress" : ticket.status,
      },
    });
    return ok(updated);
  }

  if (action === "close") {
    const updated = await prisma.supportTicket.update({
      where: { id },
      data: { status: "closed", closedAt: new Date() },
    });
    await logAudit(auth.session, "close_ticket", "ticket", id, { number: ticket.number });
    return ok(updated);
  }

  if (action === "reopen") {
    const updated = await prisma.supportTicket.update({
      where: { id },
      data: { status: "in_progress", closedAt: null },
    });
    await logAudit(auth.session, "reopen_ticket", "ticket", id, { number: ticket.number });
    return ok(updated);
  }

  if (action === "priority" && typeof body?.priority === "string") {
    const updated = await prisma.supportTicket.update({
      where: { id },
      data: { priority: body.priority },
    });
    return ok(updated);
  }

  if (action === "status" && typeof body?.status === "string") {
    const updated = await prisma.supportTicket.update({
      where: { id },
      data: { status: body.status },
    });
    return ok(updated);
  }

  return fail("لا توجد عملية صالحة", 422);
}
