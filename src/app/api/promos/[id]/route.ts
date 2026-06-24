import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("promotions");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.status === "string") data.status = body.status;
  if (body.value !== undefined) data.value = Number(body.value);
  if (body.minOrder !== undefined) data.minOrder = Number(body.minOrder);
  if (body.usageLimit !== undefined) data.usageLimit = Number(body.usageLimit);
  if (Object.keys(data).length === 0) return fail("لا توجد بيانات للتحديث", 422);

  const promo = await prisma.promo.update({ where: { id: Number(params.id) }, data });
  return ok(promo);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("promotions");
  if ("error" in auth) return auth.error;

  await prisma.promo.delete({ where: { id: Number(params.id) } });
  return ok({ deleted: true });
}
