import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, parseListParams, buildMeta } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const auth = await requireModule("trips");
  if ("error" in auth) return auth.error;

  const { page, perPage, search, status, type, skip } = parseListParams(req.url);
  const scheduled = new URL(req.url).searchParams.get("scheduled");

  const where: any = {};
  if (search) {
    where.OR = [
      { number: { contains: search } },
      { pickupAddress: { contains: search } },
      { dropAddress: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (type) where.type = type;
  if (scheduled === "true") where.scheduledAt = { not: null };

  const [total, trips] = await Promise.all([
    prisma.trip.count({ where }),
    prisma.trip.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        driver: { select: { id: true, name: true, phone: true } },
        vendor: { select: { id: true, name: true } },
      },
    }),
  ]);

  return ok(trips, buildMeta(total, page, perPage));
}
