import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { haversineKm } from "@/lib/pricing";
import { okV1, requireV1Auth } from "@/lib/v1/api";
import { durationFromDistance, tripToJson } from "@/lib/v1/trips";

const PICKUP_RADIUS_KM = 10; // نُظهر الرحلات في دائرة 10 كم حول السائق

/**
 * GET /api/v1/driver/trips/pending
 * query: lat&lng (موقع السائق الحالي)
 *
 * يرجع: { trips: [{ ... tripData, distanceToPickup, etaToPickup }] }
 */
export async function GET(req: NextRequest) {
  const auth = await requireV1Auth(req, { role: "driver" });
  if ("error" in auth) return auth.error;

  const driver = await prisma.driver.findUnique({ where: { id: auth.session.userId } });
  if (!driver || driver.status !== "approved") {
    return okV1({ trips: [] });
  }
  if (!driver.available) return okV1({ trips: [] });

  // إغلاق استقبال الطلبات الجديدة قبل ساعة من موعد رحلة مجدولة مُسندة لهذا السائق (نقطة 3)
  const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
  const upcomingScheduled = await prisma.trip.findFirst({
    where: {
      driverId: driver.id,
      status: { in: ["pending", "accepted"] },
      scheduledAt: { gte: new Date(), lte: inOneHour },
    },
  });
  if (upcomingScheduled) {
    return okV1({ trips: [], locked: true, lockedReason: "لديك رحلة مجدولة قريبة", scheduledTripId: upcomingScheduled.id });
  }

  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat") ?? driver.lat ?? "");
  const lng = Number(searchParams.get("lng") ?? driver.lng ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return okV1({ trips: [] });
  }

  const trips = await prisma.trip.findMany({
    where: { status: "pending", driverId: null },
    include: { customer: true },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const enriched = trips
    .map((t) => {
      if (t.pickupLat == null || t.pickupLng == null) return null;
      const distanceToPickup = Math.round(
        haversineKm(lat, lng, t.pickupLat, t.pickupLng) * 100,
      ) / 100;
      if (distanceToPickup > PICKUP_RADIUS_KM) return null;
      return {
        ...tripToJson(t),
        distanceToPickup,
        etaToPickup: durationFromDistance(distanceToPickup),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a!.distanceToPickup as number) - (b!.distanceToPickup as number));

  return okV1({ trips: enriched });
}
