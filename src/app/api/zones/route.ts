import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";

export async function GET() {
  const auth = await requireModule("pricing");
  if ("error" in auth) return auth.error;

  const zones = await prisma.zone.findMany({ orderBy: { createdAt: "desc" } });
  return ok(zones);
}

export async function POST(req: NextRequest) {
  const auth = await requireModule("pricing");
  if ("error" in auth) return auth.error;

  const b = await req.json().catch(() => ({}));
  const name = String(b?.name || "").trim();
  const city = String(b?.city || "").trim();
  const centerLat = Number(b?.centerLat);
  const centerLng = Number(b?.centerLng);

  if (!name || !city) return fail("الاسم والمدينة مطلوبان", 422);
  if (Number.isNaN(centerLat) || Number.isNaN(centerLng)) return fail("إحداثيات المركز مطلوبة", 422);

  const zone = await prisma.zone.create({
    data: {
      name,
      city,
      centerLat,
      centerLng,
      radiusKm: Number(b?.radiusKm ?? 10),
      priceMultiplier: Number(b?.priceMultiplier ?? 1),
      active: b?.active !== false,
    },
  });
  return ok(zone);
}
