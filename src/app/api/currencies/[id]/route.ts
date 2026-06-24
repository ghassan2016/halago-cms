import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";

/** PATCH /api/currencies/[id] — تحديث سعر صرف/تفعيل/تعيين كقاعدة */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("settings");
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.fxRate === "number" && body.fxRate > 0) data.fxRate = body.fxRate;
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.nameAr === "string" && body.nameAr.trim()) data.nameAr = body.nameAr.trim();
  if (typeof body.symbol === "string" && body.symbol.trim()) data.symbol = body.symbol.trim();

  if (body.isBase === true) {
    // واحدة فقط يمكن أن تكون base — نُعيد ضبط البقية
    await prisma.currency.updateMany({ data: { isBase: false }, where: { isBase: true } });
    data.isBase = true;
    data.fxRate = 1; // العملة الأساسية دائماً معدّلها 1
  } else if (body.isBase === false) {
    data.isBase = false;
  }

  if (Object.keys(data).length === 0) return fail("لا تغييرات", 422);

  const updated = await prisma.currency.update({ where: { id }, data });
  return ok(updated);
}

/** DELETE /api/currencies/[id] — لا يُسمح بحذف العملة الأساسية */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("settings");
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  const c = await prisma.currency.findUnique({ where: { id } });
  if (!c) return fail("العملة غير موجودة", 404);
  if (c.isBase) return fail("لا يمكن حذف العملة الأساسية", 409);
  await prisma.currency.delete({ where: { id } });
  return ok({ id });
}
