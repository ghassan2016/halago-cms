import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("trips");
  if ("error" in auth) return auth.error;

  const trip = await prisma.trip.findUnique({
    where: { id: Number(params.id) },
    include: { customer: true, driver: true, vendor: true },
  });
  if (!trip) return fail("الرحلة غير موجودة", 404);
  return ok(trip);
}

/**
 * تدخّل إداري على الرحلة:
 *  - action=cancel    → إلغاء الرحلة
 *  - action=reassign  → إعادة تعيين سائق (driverId)
 *  - action=refund    → استرداد المبلغ للعميل (يسجّل معاملة refund + paymentStatus=refunded)
 *  - أو status مباشرة (توافق خلفي)
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("trips");
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");

  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) return fail("الرحلة غير موجودة", 404);

  // إعادة تعيين سائق
  if (action === "reassign") {
    const driverId = Number(body?.driverId);
    if (!driverId) return fail("يجب تحديد السائق", 422);
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) return fail("السائق غير موجود", 404);
    if (driver.status !== "approved") return fail("السائق غير معتمد", 422);

    const updated = await prisma.trip.update({ where: { id }, data: { driverId } });
    await logAudit(auth.session, "reassign_trip", "trip", id, {
      number: trip.number,
      fromDriver: trip.driverId,
      toDriver: driverId,
    });
    return ok(updated);
  }

  // استرداد المبلغ
  if (action === "refund") {
    if (trip.paymentStatus === "refunded") return fail("تم استرداد هذه الرحلة مسبقاً", 409);
    const ops: any[] = [
      prisma.transaction.create({
        data: {
          type: "refund",
          amount: trip.fare,
          actorType: "customer",
          actorId: trip.customerId,
          refId: trip.id,
        },
      }),
      prisma.trip.update({ where: { id }, data: { paymentStatus: "refunded" } }),
    ];
    // إعادة المبلغ لمحفظة العميل إن وُجد
    if (trip.customerId) {
      ops.push(
        prisma.customer.update({
          where: { id: trip.customerId },
          data: { walletBalance: { increment: trip.fare } },
        })
      );
    }
    await prisma.$transaction(ops);
    const updated = await prisma.trip.findUnique({ where: { id } });
    await logAudit(auth.session, "refund_trip", "trip", id, { number: trip.number, amount: trip.fare });
    return ok(updated);
  }

  // إلغاء
  if (action === "cancel" || body?.status === "cancelled") {
    if (trip.status === "completed") return fail("لا يمكن إلغاء رحلة مكتملة", 409);
    const updated = await prisma.trip.update({ where: { id }, data: { status: "cancelled" } });
    await logAudit(auth.session, "cancel_trip", "trip", id, { number: trip.number });
    return ok(updated);
  }

  // تحديث حالة عام (توافق خلفي)
  if (typeof body.status === "string") {
    const updated = await prisma.trip.update({ where: { id }, data: { status: body.status } });
    return ok(updated);
  }

  return fail("لا توجد عملية صالحة", 422);
}
