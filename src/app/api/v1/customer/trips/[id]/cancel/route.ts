import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ERRORS, okV1, requireV1Auth } from "@/lib/v1/api";
import { tripToJson } from "@/lib/v1/trips";

/**
 * POST /api/v1/customer/trips/:id/cancel
 * body: { reason?: string }
 *
 * يُلغي الرحلة. إذا قبلها السائق قبل أكثر من 3 دقائق، يُحاسَب الراكب رسوم إلغاء.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireV1Auth(req, { role: "customer" });
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  if (!Number.isFinite(id)) return ERRORS.notFound("الرحلة");

  const trip = await prisma.trip.findUnique({ where: { id }, include: { driver: true } });
  if (!trip) return ERRORS.notFound("الرحلة");
  if (trip.customerId !== auth.session.userId) return ERRORS.forbidden();

  if (!["pending", "accepted", "arrived"].includes(trip.status)) {
    return ERRORS.validation("لا يمكن إلغاء هذه الرحلة في حالتها الحالية");
  }

  let reason = "";
  let reasonKey = "";
  try {
    const body = (await req.json()) as { reason?: string; reasonKey?: string };
    reason = body?.reason || "";
    reasonKey = body?.reasonKey || "";
  } catch {
    // body اختياري
  }

  // رسوم إلغاء؟ تُطبّق دائماً إذا وصل السائق (arrived)، أو إذا مرّ > 3 دقائق على القبول
  let cancellationFee = 0;
  if (trip.status === "arrived" || trip.status === "accepted") {
    const acceptedAgo = (Date.now() - trip.createdAt.getTime()) / 1000;
    const driverArrived = trip.status === "arrived";
    if (driverArrived || acceptedAgo > 180) {
      const rule = await prisma.pricingRule.findFirst({
        where: { vehicleType: trip.driver?.vehicleType || "car", serviceType: trip.type, active: true },
      });
      cancellationFee = rule?.cancellationFee ?? 0;
    }
  }

  const ops: any[] = [];
  // خصم رسوم الإلغاء من محفظة الزبون + تعويض السائق + تسجيل الحركات
  if (cancellationFee > 0) {
    if (trip.customerId) {
      ops.push(
        prisma.customer.update({
          where: { id: trip.customerId },
          data: { walletBalance: { decrement: cancellationFee } },
        }),
        prisma.transaction.create({
          data: {
            type: "cancellation_fee",
            amount: -cancellationFee,
            actorType: "customer",
            actorId: trip.customerId,
            refId: trip.id,
            note: "رسوم إلغاء رحلة" + (trip.status === "arrived" ? " (بعد وصول السائق)" : ""),
          },
        })
      );
    }
    // تعويض السائق برسوم الإلغاء (خصوصاً عند وصوله)
    if (trip.driverId) {
      ops.push(
        prisma.driver.update({
          where: { id: trip.driverId },
          data: { walletBalance: { increment: cancellationFee } },
        }),
        prisma.transaction.create({
          data: {
            type: "cancellation_fee",
            amount: cancellationFee,
            actorType: "driver",
            actorId: trip.driverId,
            refId: trip.id,
            note: "تعويض إلغاء رحلة",
          },
        })
      );
    }
  }

  ops.push(
    prisma.trip.update({
      where: { id },
      data: {
        status: "cancelled",
        fare: cancellationFee,
        paymentStatus: "paid",
        cancelledBy: "customer",
        cancelledAt: new Date(),
        cancelReason: reason || null,
        cancelReasonKey: reasonKey || null,
        cancelAction: cancellationFee > 0 ? "fee_charged" : "accepted",
      },
    })
  );

  await prisma.$transaction(ops);
  const updated = await prisma.trip.findUnique({ where: { id }, include: { driver: true, customer: true } });

  return okV1({ ...tripToJson(updated!), cancellationFee, cancelReason: reason });
}
