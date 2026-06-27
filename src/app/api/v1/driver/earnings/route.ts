import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { okV1, requireV1Auth } from "@/lib/v1/api";

function rangeStart(range: string): Date {
  const now = new Date();
  const d = new Date(now);
  switch (range) {
    case "day":
      d.setHours(0, 0, 0, 0);
      return d;
    case "week":
      d.setDate(now.getDate() - 7);
      return d;
    case "month":
      d.setMonth(now.getMonth() - 1);
      return d;
    case "all":
    default:
      return new Date(0);
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireV1Auth(req, { role: "driver" });
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "day";
  const since = rangeStart(range);

  const trips = await prisma.trip.findMany({
    where: {
      driverId: auth.session.userId,
      status: "completed",
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const grossTotal = trips.reduce((s, t) => s + t.fare, 0);
  const commissionTotal = trips.reduce((s, t) => s + t.commission, 0);
  const netTotal = Math.round((grossTotal - commissionTotal) * 100) / 100;
  const grossRounded = Math.round(grossTotal * 100) / 100;
  const commissionRounded = Math.round(commissionTotal * 100) / 100;

  const distanceTotal = Math.round(
    trips.reduce((s, t) => s + t.distance, 0) * 100,
  ) / 100;

  return okV1({
    range,
    gross: grossRounded,
    commission: commissionRounded,
    net: netTotal,
    tripsCount: trips.length,
    distanceKm: distanceTotal,
    currency: "SAR",
    trips: trips.map((t) => ({
      id: String(t.id),
      number: t.number,
      fare: t.fare,
      commission: t.commission,
      net: Math.round((t.fare - t.commission) * 100) / 100,
      distance: t.distance,
      duration: t.duration,
      paymentMethod: t.paymentMethod,
      createdAt: t.createdAt,
      pickupAddress: t.pickupAddress,
      dropAddress: t.dropAddress,
    })),
  });
}
