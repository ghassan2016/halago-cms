import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";

/** PATCH /api/referral-codes/[id] — تفعيل/تعطيل أو تعديل المكافأة */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("referrals");
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const code = await prisma.referralCode.findUnique({ where: { id } });
  if (!code) return fail("الكود غير موجود", 404);

  const data: any = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.rewardPerUse === "number" && body.rewardPerUse >= 0) data.rewardPerUse = body.rewardPerUse;
  if (Object.keys(data).length === 0) return fail("لا تغييرات لإجرائها", 422);

  const updated = await prisma.referralCode.update({ where: { id }, data });
  return ok(updated);
}
