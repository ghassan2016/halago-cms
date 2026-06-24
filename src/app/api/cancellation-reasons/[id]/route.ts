import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";

/** PATCH /api/cancellation-reasons/[id] — تعديل سبب */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("cancellations");
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.labelAr === "string" && body.labelAr.trim()) data.labelAr = body.labelAr.trim();
  if (typeof body.labelEn === "string" && body.labelEn.trim()) data.labelEn = body.labelEn.trim();
  if (typeof body.audience === "string" && ["driver", "customer", "both"].includes(body.audience)) data.audience = body.audience;
  if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;
  if (typeof body.active === "boolean") data.active = body.active;
  if (Object.keys(data).length === 0) return fail("لا تغييرات", 422);

  const updated = await prisma.cancellationReason.update({ where: { id }, data });
  return ok(updated);
}

/** DELETE /api/cancellation-reasons/[id] */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("cancellations");
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  await prisma.cancellationReason.delete({ where: { id } });
  return ok({ id });
}
