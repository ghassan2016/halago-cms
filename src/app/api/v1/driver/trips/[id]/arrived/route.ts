import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ERRORS, okV1, requireV1Auth } from "@/lib/v1/api";
import { emitTripStatusChange } from "@/lib/v1/events";
import { notifyTripArrived } from "@/lib/v1/push";
import { tripToJson } from "@/lib/v1/trips";

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
  if (trip.status !== "accepted") {
    return ERRORS.validation("الحالة الحالية لا تسمح بـ arrived");
  }

  const updated = await prisma.trip.update({
    where: { id },
    data: { status: "arrived" },
    include: { driver: true, customer: true },
  });
  emitTripStatusChange(updated.id, "arrived");
  if (updated.customerId) void notifyTripArrived(updated.id, updated.customerId);
  return okV1(tripToJson(updated));
}
