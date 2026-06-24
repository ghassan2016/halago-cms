import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

/** GET /api/sos/[id] — تفاصيل تنبيه طوارئ */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("sos");
  if ("error" in auth) return auth.error;

  const alert = await prisma.sosAlert.findUnique({ where: { id: Number(params.id) } });
  if (!alert) return fail("التنبيه غير موجود", 404);
  return ok(alert);
}

/**
 * PATCH /api/sos/[id] — تحديث حالة تنبيه:
 *  - action=ack       → in_progress (إقرار باستلام التنبيه)
 *  - action=resolve   → resolved (مع ملخّص حلّ)
 *  - action=dismiss   → dismissed (تنبيه خاطئ/مكرر)
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("sos");
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");

  const alert = await prisma.sosAlert.findUnique({ where: { id } });
  if (!alert) return fail("التنبيه غير موجود", 404);

  if (action === "ack") {
    const updated = await prisma.sosAlert.update({
      where: { id },
      data: {
        status: "in_progress",
        handlerId: auth.session?.sub ? Number(auth.session.sub) : null,
        handlerName: auth.session?.name ?? null,
      },
    });
    return ok(updated);
  }

  if (action === "resolve") {
    const resolution = String(body?.resolution || "").trim();
    if (!resolution) return fail("يجب كتابة ملخّص الحلّ", 422);
    const updated = await prisma.sosAlert.update({
      where: { id },
      data: {
        status: "resolved",
        resolution,
        resolvedAt: new Date(),
        handlerId: auth.session?.sub ? Number(auth.session.sub) : null,
        handlerName: auth.session?.name ?? null,
      },
    });
    await logAudit(auth.session, "resolve_sos", "sos", id, { reason: alert.reason, severity: alert.severity });
    return ok(updated);
  }

  if (action === "dismiss") {
    const updated = await prisma.sosAlert.update({
      where: { id },
      data: {
        status: "dismissed",
        resolvedAt: new Date(),
        handlerId: auth.session?.sub ? Number(auth.session.sub) : null,
        handlerName: auth.session?.name ?? null,
      },
    });
    await logAudit(auth.session, "dismiss_sos", "sos", id, { reason: alert.reason });
    return ok(updated);
  }

  return fail("لا توجد عملية صالحة", 422);
}
