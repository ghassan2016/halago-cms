import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ERRORS, okV1, requireV1Auth } from "@/lib/v1/api";
import { tripToJson } from "@/lib/v1/trips";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireV1Auth(req, { role: "customer" });
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  if (!Number.isFinite(id)) return ERRORS.notFound("الرحلة");

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { driver: true, customer: true },
  });
  if (!trip) return ERRORS.notFound("الرحلة");
  if (trip.customerId !== auth.session.userId) return ERRORS.forbidden();

  return okV1(tripToJson(trip));
}
