import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

/** PATCH /api/fraud/[id] — تأكيد أو إغلاق علامة احتيال */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("fraud");
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");

  const flag = await prisma.fraudFlag.findUnique({ where: { id } });
  if (!flag) return fail("العلامة غير موجودة", 404);

  if (action === "review") {
    const updated = await prisma.fraudFlag.update({
      where: { id },
      data: {
        status: "reviewing",
        handlerId: auth.session?.sub ? Number(auth.session.sub) : null,
        handlerName: auth.session?.name ?? null,
      },
    });
    return ok(updated);
  }

  if (action === "confirm") {
    const note = String(body?.note || "").trim() || null;
    const updated = await prisma.fraudFlag.update({
      where: { id },
      data: {
        status: "confirmed",
        note,
        resolvedAt: new Date(),
        handlerId: auth.session?.sub ? Number(auth.session.sub) : null,
        handlerName: auth.session?.name ?? null,
      },
    });
    await logAudit(auth.session, "confirm_fraud", "fraud", id, {
      subjectType: flag.subjectType,
      subjectId: flag.subjectId,
      reason: flag.reason,
    });
    return ok(updated);
  }

  if (action === "dismiss") {
    const note = String(body?.note || "").trim() || null;
    const updated = await prisma.fraudFlag.update({
      where: { id },
      data: {
        status: "dismissed",
        note,
        resolvedAt: new Date(),
        handlerId: auth.session?.sub ? Number(auth.session.sub) : null,
        handlerName: auth.session?.name ?? null,
      },
    });
    await logAudit(auth.session, "dismiss_fraud", "fraud", id, {
      subjectType: flag.subjectType,
      subjectId: flag.subjectId,
      reason: flag.reason,
    });
    return ok(updated);
  }

  return fail("لا توجد عملية صالحة", 422);
}
