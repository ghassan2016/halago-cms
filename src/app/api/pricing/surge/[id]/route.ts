import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("pricing");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (body.multiplier !== undefined) data.multiplier = Number(body.multiplier);
  if (Object.keys(data).length === 0) return fail("لا توجد بيانات للتحديث", 422);

  const rule = await prisma.surgeRule.update({ where: { id: Number(params.id) }, data });
  return ok(rule);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("pricing");
  if ("error" in auth) return auth.error;

  await prisma.surgeRule.delete({ where: { id: Number(params.id) } });
  return ok({ deleted: true });
}
