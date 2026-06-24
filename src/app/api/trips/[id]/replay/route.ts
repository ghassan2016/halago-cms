import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";

/** GET /api/trips/[id]/replay — نقاط مسار رحلة لإعادة التشغيل */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("trips");
  if ("error" in auth) return auth.error;

  const tripId = Number(params.id);
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      number: true,
      pickupLat: true,
      pickupLng: true,
      pickupAddress: true,
      dropLat: true,
      dropLng: true,
      dropAddress: true,
      distance: true,
      duration: true,
      status: true,
      createdAt: true,
    },
  });
  if (!trip) return fail("الرحلة غير موجودة", 404);

  const breadcrumbs = await prisma.tripBreadcrumb.findMany({
    where: { tripId },
    orderBy: { sequence: "asc" },
    select: { lat: true, lng: true, speed: true, recordedAt: true },
  });

  return ok({
    trip,
    points: breadcrumbs,
    hasPath: breadcrumbs.length > 1,
  });
}
