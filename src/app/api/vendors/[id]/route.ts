import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("vendors");
  if ("error" in auth) return auth.error;

  const vendor = await prisma.vendor.findUnique({
    where: { id: Number(params.id) },
    include: {
      products: { orderBy: { createdAt: "desc" } },
      _count: { select: { products: true, trips: true } },
    },
  });
  if (!vendor) return fail("المتجر غير موجود", 404);
  return ok(vendor);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("vendors");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.status === "string") data.status = body.status; // open | frozen | closed | pending
  if (body.commission !== undefined) data.commission = Number(body.commission);
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.category === "string") data.category = body.category;
  if (typeof body.phone === "string") data.phone = body.phone.trim() || null;
  if (typeof body.address === "string") data.address = body.address.trim() || null;
  if (Object.keys(data).length === 0) return fail("لا توجد بيانات للتحديث", 422);

  const vendor = await prisma.vendor.update({ where: { id: Number(params.id) }, data });
  await logAudit(auth.session, "update_vendor", "vendor", vendor.id, data);
  return ok(vendor);
}

// DELETE /api/vendors/:id — حذف متجر (مع منتجاته)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("vendors");
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) return fail("المتجر غير موجود", 404);

  await prisma.vendor.delete({ where: { id } });
  await logAudit(auth.session, "delete_vendor", "vendor", id, { name: vendor.name });
  return ok({ deleted: true });
}
