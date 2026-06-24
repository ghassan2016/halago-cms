import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("pricing");
  if ("error" in auth) return auth.error;

  const b = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof b.active === "boolean") data.active = b.active;
  if (b.amount !== undefined) data.amount = Number(b.amount);
  if (typeof b.name === "string") data.name = b.name;
  if (Object.keys(data).length === 0) return fail("لا توجد بيانات للتحديث", 422);

  const fee = await prisma.extraFee.update({ where: { id: Number(params.id) }, data });
  return ok(fee);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("pricing");
  if ("error" in auth) return auth.error;

  await prisma.extraFee.delete({ where: { id: Number(params.id) } });
  return ok({ deleted: true });
}
