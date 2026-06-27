import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ERRORS, okV1, requireV1Auth } from "@/lib/v1/api";
import { emitTripStatusChange } from "@/lib/v1/events";
import { notifyTripCompleted } from "@/lib/v1/push";
import { tripToJson } from "@/lib/v1/trips";

/**
 * POST /api/v1/driver/trips/:id/complete
 * body: { actualDistance?, actualDuration? }
 *
 * يكمل الرحلة + يحدّث رصيد السائق + يخصم من المحفظة لو كان الدفع منها.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireV1Auth(req, { role: "driver" });
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  if (!Number.isFinite(id)) return ERRORS.notFound("الرحلة");

  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) return ERRORS.notFound("الرحلة");
  if (trip.driverId !== auth.session.userId) return ERRORS.forbidden();
  if (trip.status !== "in_progress") {
    return ERRORS.validation("الرحلة لم تبدأ بعد");
  }

  let body: { actualDistance?: number; actualDuration?: number } = {};
  try {
    body = await req.json();
  } catch {
    // اختياري
  }

  const distance = Number.isFinite(Number(body.actualDistance))
    ? Number(body.actualDistance)
    : trip.distance;
  const duration = Number.isFinite(Number(body.actualDuration))
    ? Number(body.actualDuration)
    : trip.duration;

  // عمولة المنصّة 15% افتراضياً
  const COMMISSION_PCT = 0.15;
  const commission = Math.round(trip.fare * COMMISSION_PCT * 100) / 100;
  const driverShare = Math.round((trip.fare - commission) * 100) / 100;

  // خصم من المحفظة لو الدفع منها
  let paymentStatus = trip.paymentStatus;
  if (trip.paymentMethod === "wallet" && trip.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: trip.customerId } });
    if (customer && customer.walletBalance >= trip.fare) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { walletBalance: { decrement: trip.fare } },
      });
      paymentStatus = "paid";
    } else {
      paymentStatus = "pending"; // يبقى pending — يدفع نقداً
    }
  } else if (trip.paymentMethod === "cash") {
    paymentStatus = "paid"; // افتراض: السائق قبض
  }

  // تحديث الرحلة + رصيد السائق + إحصائيات
  const [updated] = await prisma.$transaction([
    prisma.trip.update({
      where: { id },
      data: {
        status: "completed",
        distance,
        duration,
        commission,
        paymentStatus,
      },
      include: { driver: true, customer: true },
    }),
    prisma.driver.update({
      where: { id: auth.session.userId },
      data: {
        walletBalance: { increment: driverShare },
        totalTrips: { increment: 1 },
      },
    }),
    // معاملة المنصّة (عمولة)
    prisma.transaction.create({
      data: {
        type: "commission",
        amount: commission,
        actorType: "platform",
        refId: id,
      },
    }),
    // معاملة السائق (الصافي)
    prisma.transaction.create({
      data: {
        type: "ride_payment",
        amount: driverShare,
        actorType: "driver",
        actorId: auth.session.userId,
        refId: id,
      },
    }),
  ]);

  if (trip.customerId) {
    await prisma.customer.update({
      where: { id: trip.customerId },
      data: { totalTrips: { increment: 1 } },
    });
  }

  emitTripStatusChange(updated.id, "completed");
  if (updated.customerId) void notifyTripCompleted(updated.id, updated.customerId);
  return okV1({
    ...tripToJson(updated),
    commission,
    driverShare,
  });
}
