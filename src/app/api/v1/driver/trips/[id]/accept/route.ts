import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ERRORS, okV1, requireV1Auth } from "@/lib/v1/api";
import { emitTripStatusChange } from "@/lib/v1/events";
import { notifyTripAccepted } from "@/lib/v1/push";
import { tripToJson } from "@/lib/v1/trips";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireV1Auth(req, { role: "driver" });
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  if (!Number.isFinite(id)) return ERRORS.notFound("الرحلة");

  const driver = await prisma.driver.findUnique({ where: { id: auth.session.userId } });
  if (!driver || driver.status !== "approved") return ERRORS.forbidden();

  // هل لدى السائق رحلة نشطة بالفعل؟ نمنع
  const driverActive = await prisma.trip.findFirst({
    where: {
      driverId: driver.id,
      status: { in: ["accepted", "arrived", "in_progress"] },
    },
  });
  if (driverActive) {
    return ERRORS.validation("لديك رحلة نشطة بالفعل", {
      activeTripId: String(driverActive.id),
    });
  }

  // محاولة atomic لقبول الرحلة — يحمي من سباق سائقَين
  try {
    const updated = await prisma.trip.update({
      where: { id, status: "pending", driverId: null },
      data: { driverId: driver.id, status: "accepted" },
      include: { driver: true, customer: true },
    });
    emitTripStatusChange(updated.id, "accepted", {
      driver: tripToJson(updated).driver,
    });
    if (updated.customerId) {
      // fire-and-forget — لا نوقف الـ response
      void notifyTripAccepted(updated.id, updated.customerId);
    }
    return okV1(tripToJson(updated));
  } catch {
    // Prisma update with `where` يفشل لو لم تتطابق الشروط
    return ERRORS.validation("تمّ قبول الرحلة من سائق آخر");
  }
}
