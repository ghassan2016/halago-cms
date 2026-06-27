import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ERRORS, okV1, requireV1Auth } from "@/lib/v1/api";

/**
 * POST /api/v1/driver/location
 * body: { lat, lng, speed?, heading?, tripId? }
 *
 * يحدّث موقع السائق. لو فيه tripId، يحفظ breadcrumb للـ replay.
 */
export async function POST(req: NextRequest) {
  const auth = await requireV1Auth(req, { role: "driver" });
  if ("error" in auth) return auth.error;

  let body: { lat?: number; lng?: number; speed?: number; tripId?: string };
  try {
    body = await req.json();
  } catch {
    return ERRORS.validation("body غير صالح");
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return ERRORS.validation("lat/lng غير صالحَين");
  }

  await prisma.driver.update({
    where: { id: auth.session.userId },
    data: { lat, lng },
  });

  if (body.tripId) {
    const tripId = Number(body.tripId);
    if (Number.isFinite(tripId)) {
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        select: { driverId: true, status: true },
      });
      if (trip?.driverId === auth.session.userId) {
        const last = await prisma.tripBreadcrumb.findFirst({
          where: { tripId },
          orderBy: { sequence: "desc" },
          select: { sequence: true },
        });
        const sequence = (last?.sequence ?? -1) + 1;
        await prisma.tripBreadcrumb.create({
          data: {
            tripId,
            sequence,
            lat,
            lng,
            speed: Number.isFinite(Number(body.speed)) ? Number(body.speed) : 0,
          },
        });
      }
    }
  }

  return okV1({ updated: true });
}
