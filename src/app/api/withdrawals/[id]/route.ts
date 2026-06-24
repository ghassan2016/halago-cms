import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

// الموافقة على طلب السحب أو رفضه
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("withdrawals");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const status = String(body?.status || "");
  if (!["approved", "rejected"].includes(status)) {
    return fail("الحالة يجب أن تكون approved أو rejected", 422);
  }

  const wr = await prisma.withdrawalRequest.findUnique({ where: { id: Number(params.id) } });
  if (!wr) return fail("الطلب غير موجود", 404);
  if (wr.status !== "pending") return fail("تم معالجة هذا الطلب مسبقاً", 409);

  // عند الموافقة: نخصم من رصيد السائق ونسجّل معاملة payout
  if (status === "approved") {
    await prisma.$transaction([
      prisma.withdrawalRequest.update({ where: { id: wr.id }, data: { status } }),
      prisma.driver.update({
        where: { id: wr.driverId },
        data: { walletBalance: { decrement: wr.amount } },
      }),
      prisma.transaction.create({
        data: { type: "payout", amount: wr.amount, actorType: "driver", actorId: wr.driverId, refId: wr.id },
      }),
    ]);
  } else {
    await prisma.withdrawalRequest.update({ where: { id: wr.id }, data: { status } });
  }

  await logAudit(
    auth.session,
    status === "approved" ? "approve_withdrawal" : "reject_withdrawal",
    "withdrawal",
    wr.id,
    { driverId: wr.driverId, amount: wr.amount }
  );

  return ok({ id: wr.id, status });
}
