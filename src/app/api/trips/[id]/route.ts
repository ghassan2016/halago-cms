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

    // خصم اختياري من السائق (عند سوء/خطأ السائق) — يُخصم نصيبه من الرحلة وقد تصبح محفظته سالبة
    const deductDriver = body?.deductDriver === true && !!trip.driverId;
    const driverShare = Math.round((trip.fare - trip.commission) * 100) / 100;

    const ops: any[] = [
      prisma.transaction.create({
        data: {
          type: "refund",
          amount: trip.fare,
          actorType: "customer",
          actorId: trip.customerId,
          actorName: null,
          refId: trip.id,
          note: deductDriver ? "استرداد بسبب خطأ السائق" : "استرداد إداري",
          createdById: auth.session?.sub ? Number(auth.session.sub) : null,
          createdByName: auth.session?.name ?? null,
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
    // خصم نصيب السائق وتسجيل حركة سالبة عليه
    if (deductDriver && trip.driverId && driverShare > 0) {
      ops.push(
        prisma.driver.update({
          where: { id: trip.driverId },
          data: { walletBalance: { decrement: driverShare } },
        }),
        prisma.transaction.create({
          data: {
            type: "refund",
            amount: -driverShare,
            actorType: "driver",
            actorId: trip.driverId,
            refId: trip.id,
            note: "خصم نصيب السائق نتيجة استرداد للعميل",
            createdById: auth.session?.sub ? Number(auth.session.sub) : null,
            createdByName: auth.session?.name ?? null,
          },
        })
      );
    }
    await prisma.$transaction(ops);
    const updated = await prisma.trip.findUnique({ where: { id } });
    await logAudit(auth.session, "refund_trip", "trip", id, {
      number: trip.number,
      amount: trip.fare,
      deductDriver,
      driverShare: deductDriver ? driverShare : 0,
    });
    return ok(updated);
  }

  // إلغاء
  if (action === "cancel" || body?.status === "cancelled") {
    if (trip.status === "completed") return fail("لا يمكن إلغاء رحلة مكتملة", 409);
    const updated = await prisma.trip.update({
      where: { id },
      data: {
        status: "cancelled",
        cancelledBy: "admin",
        cancelledAt: new Date(),
        cancelReason: body?.reason ? String(body.reason) : trip.cancelReason,
        cancelReasonKey: body?.reasonKey ? String(body.reasonKey) : trip.cancelReasonKey,
        cancelAction: "accepted",
      },
    });
    await logAudit(auth.session, "cancel_trip", "trip", id, { number: trip.number, reason: body?.reason });
    return ok(updated);
  }

  // تحديث حالة عام (توافق خلفي)
  if (typeof body.status === "string") {
    const updated = await prisma.trip.update({ where: { id }, data: { status: body.status } });
    return ok(updated);
  }

  return fail("لا توجد عملية صالحة", 422);
}
