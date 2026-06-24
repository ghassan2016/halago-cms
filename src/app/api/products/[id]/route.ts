import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

// تعديل منتج (الاسم/السعر/الفئة/التوفّر)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("vendors");
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return fail("المنتج غير موجود", 404);

  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) return fail("سعر غير صالح", 422);
    data.price = price;
  }
  if (body.category !== undefined) data.category = body.category ? String(body.category) : null;
  if (typeof body.available === "boolean") data.available = body.available;
  if (Object.keys(data).length === 0) return fail("لا توجد بيانات للتحديث", 422);

  const updated = await prisma.product.update({ where: { id }, data });
  await logAudit(auth.session, "update_product", "product", id, { vendorId: product.vendorId });
  return ok(updated);
}

// حذف منتج
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("vendors");
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return fail("المنتج غير موجود", 404);

  await prisma.product.delete({ where: { id } });
  await logAudit(auth.session, "delete_product", "product", id, { vendorId: product.vendorId, name: product.name });
  return ok({ id });
}
