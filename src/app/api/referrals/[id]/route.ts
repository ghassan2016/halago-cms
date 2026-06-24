import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

/** PATCH /api/referrals/[id] — صرف المكافأة أو إلغاء الإحالة */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("referrals");
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");

  const ref = await prisma.referral.findUnique({ where: { id } });
  if (!ref) return fail("الإحالة غير موجودة", 404);

  if (action === "reward") {
    if (ref.status === "rewarded") return fail("تم صرف المكافأة مسبقاً", 409);
    if (ref.status === "cancelled") return fail("لا يمكن صرف مكافأة لإحالة ملغاة", 409);

    const code = await prisma.referralCode.findUnique({ where: { id: ref.codeId } });
    const reward = ref.reward || code?.rewardPerUse || 0;

    // أضف المكافأة لمحفظة المُحيل
    const ops: any[] = [
      prisma.referral.update({
        where: { id },
        data: { status: "rewarded", reward, rewardedAt: new Date(), completedAt: ref.completedAt ?? new Date() },
      }),
      prisma.transaction.create({
        data: {
          type: "topup",
          amount: reward,
          actorType: ref.referrerType,
          actorId: ref.referrerId,
          refId: id,
        },
      }),
    ];
    if (ref.referrerType === "customer") {
      ops.push(prisma.customer.update({ where: { id: ref.referrerId }, data: { walletBalance: { increment: reward } } }));
    } else if (ref.referrerType === "driver") {
      ops.push(prisma.driver.update({ where: { id: ref.referrerId }, data: { walletBalance: { increment: reward } } }));
    }
    await prisma.$transaction(ops);
    await logAudit(auth.session, "reward_referral", "referral", id, { reward, referrerType: ref.referrerType, referrerId: ref.referrerId });
    return ok(await prisma.referral.findUnique({ where: { id } }));
  }

  if (action === "cancel") {
    const updated = await prisma.referral.update({ where: { id }, data: { status: "cancelled" } });
    return ok(updated);
  }

  return fail("لا توجد عملية صالحة", 422);
}
