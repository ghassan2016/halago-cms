import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

/** POST /api/support/[id]/messages — إرسال رد إداري على تذكرة */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("support");
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const text = String(body?.body || "").trim();
  if (!text) return fail("لا يمكن إرسال رد فارغ", 422);
  if (text.length > 4000) return fail("الرد طويل جداً", 422);

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) return fail("التذكرة غير موجودة", 404);

  const message = await prisma.ticketMessage.create({
    data: {
      ticketId: id,
      senderType: "admin",
      senderId: auth.session?.sub ? Number(auth.session.sub) : null,
      senderName: auth.session?.name ?? null,
      body: text,
    },
  });

  await prisma.supportTicket.update({
    where: { id },
    data: {
      lastReplyBy: "admin",
      lastReplyAt: new Date(),
      status: ticket.status === "open" || ticket.status === "waiting_user" ? "in_progress" : ticket.status,
      assigneeId: ticket.assigneeId ?? (auth.session?.sub ? Number(auth.session.sub) : null),
      assigneeName: ticket.assigneeName ?? auth.session?.name ?? null,
    },
  });

  await logAudit(auth.session, "reply_ticket", "ticket", id, { number: ticket.number });
  return ok(message);
}
