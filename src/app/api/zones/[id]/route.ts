import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("pricing");
  if ("error" in auth) return auth.error;

  const b = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof b.active === "boolean") data.active = b.active;
  if (b.priceMultiplier !== undefined) data.priceMultiplier = Number(b.priceMultiplier);
  if (b.radiusKm !== undefined) data.radiusKm = Number(b.radiusKm);
  if (typeof b.name === "string") data.name = b.name;
  if (Object.keys(data).length === 0) return fail("لا توجد بيانات للتحديث", 422);

  const zone = await prisma.zone.update({ where: { id: Number(params.id) }, data });
  return ok(zone);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("pricing");
  if ("error" in auth) return auth.error;

  await prisma.zone.delete({ where: { id: Number(params.id) } });
  return ok({ deleted: true });
}
