import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/wallet/adjust — تعديل رصيد يدوي (تعويض موجب أو خصم سالب) لزبون أو سائق
 * body: { ownerType: "customer"|"driver", ownerId, amount (+/-), note }
 * يُسجّل حركة من نوع adjustment ويحدّث المحفظة.
 */
export async function POST(req: NextRequest) {
  const auth = await requireModule("finance");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const ownerType = String(body?.ownerType || "");
  const ownerId = Number(body?.ownerId);
  const amount = Number(body?.amount);
  const note = String(body?.note || "").trim();

  if (ownerType !== "customer" && ownerType !== "driver") return fail("نوع الحساب غير صالح", 422);
  if (!ownerId) return fail("معرّف الحساب مطلوب", 422);
  if (!Number.isFinite(amount) || amount === 0) return fail("المبلغ مطلوب (موجب للتعويض، سالب للخصم)", 422);
  if (!note) return fail("سبب التعديل مطلوب", 422);

  const rounded = Math.round(amount * 100) / 100;

  let actorName: string | null = null;
  if (ownerType === "customer") {
    const c = await prisma.customer.findUnique({ where: { id: ownerId } });
    if (!c) return fail("العميل غير موجود", 404);
    actorName = c.name;
    await prisma.$transaction([
      prisma.customer.update({ where: { id: ownerId }, data: { walletBalance: { increment: rounded } } }),
      prisma.transaction.create({
        data: {
          type: "adjustment",
          amount: rounded,
          actorType: "customer",
          actorId: ownerId,
          actorName,
          note,
          createdById: auth.session?.sub ? Number(auth.session.sub) : null,
          createdByName: auth.session?.name ?? null,
        },
      }),
    ]);
  } else {
    const d = await prisma.driver.findUnique({ where: { id: ownerId } });
    if (!d) return fail("السائق غير موجود", 404);
    actorName = d.name;
    await prisma.$transaction([
      prisma.driver.update({ where: { id: ownerId }, data: { walletBalance: { increment: rounded } } }),
      prisma.transaction.create({
        data: {
          type: "adjustment",
          amount: rounded,
          actorType: "driver",
          actorId: ownerId,
          actorName,
          note,
          createdById: auth.session?.sub ? Number(auth.session.sub) : null,
          createdByName: auth.session?.name ?? null,
        },
      }),
    ]);
  }

  await logAudit(auth.session, "wallet_adjust", ownerType, ownerId, { amount: rounded, note });
  return ok({ ownerType, ownerId, amount: rounded });
}
