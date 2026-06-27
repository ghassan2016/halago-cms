// أدوات مساعدة للرحلات (ترقيم، تسلسل، تحويل لـ JSON صديق للموبايل).
import type { Trip, Driver, Customer } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** يولّد رقم رحلة فريد: HG-100000 + sequence */
export async function nextTripNumber(): Promise<string> {
  const last = await prisma.trip.findFirst({
    orderBy: { id: "desc" },
    select: { number: true, id: true },
  });
  const base = 100000;
  const next = last ? base + last.id : base + 1;
  return `HG-${next}`;
}

export type TripPayload = ReturnType<typeof tripToJson>;

/** يحوّل Trip + relations لشكل صديق لتطبيق Flutter */
export function tripToJson(
  trip: Trip & { driver?: Driver | null; customer?: Customer | null },
) {
  return {
    id: String(trip.id),
    number: trip.number,
    type: trip.type,
    status: trip.status,
    pickup: {
      address: trip.pickupAddress,
      lat: trip.pickupLat,
      lng: trip.pickupLng,
    },
    drop: {
      address: trip.dropAddress,
      lat: trip.dropLat,
      lng: trip.dropLng,
    },
    distance: trip.distance,
    duration: trip.duration,
    fare: trip.fare,
    paymentMethod: trip.paymentMethod,
    paymentStatus: trip.paymentStatus,
    rating: trip.rating,
    createdAt: trip.createdAt,
    driver: trip.driver
      ? {
          id: String(trip.driver.id),
          name: trip.driver.name,
          phone: trip.driver.phone,
          avatarUrl: trip.driver.avatar,
          rating: trip.driver.rating,
          totalTrips: trip.driver.totalTrips,
          lat: trip.driver.lat,
          lng: trip.driver.lng,
          vehicle:
            trip.driver.carMake || trip.driver.carModel || trip.driver.plateNumber
              ? {
                  make: trip.driver.carMake,
                  model: trip.driver.carModel,
                  plate: trip.driver.plateNumber,
                  class: trip.driver.vehicleType,
                }
              : null,
        }
      : null,
    customer: trip.customer
      ? {
          id: String(trip.customer.id),
          name: trip.customer.name,
          phone: trip.customer.phone,
          rating: trip.customer.rating,
        }
      : null,
  };
}

/** يحسب ETA تقريبي بالدقائق (3 دقائق/كم سرعة متوسطة في المدينة) */
export function durationFromDistance(distanceKm: number): number {
  return Math.max(2, Math.round(distanceKm * 3));
}
