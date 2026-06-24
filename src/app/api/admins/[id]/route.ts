import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ok, fail } from "@/lib/api-helpers";

const ROLES = ["super_admin", "operations", "finance", "support"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(["super_admin"]);
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (ROLES.includes(body?.role)) data.role = body.role;
  if (typeof body?.active === "boolean") data.active = body.active;
  if (Object.keys(data).length === 0) return fail("لا توجد بيانات للتحديث", 422);

  // منع تعطيل/تخفيض رتبة نفسه
  if (id === Number(auth.session.sub) && (data.active === false || data.role)) {
    return fail("لا يمكنك تعديل حسابك بهذه الطريقة", 422);
  }

  const admin = await prisma.admin.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });
  return ok(admin);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(["super_admin"]);
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  if (id === Number(auth.session.sub)) return fail("لا يمكنك حذف حسابك", 422);

  await prisma.admin.delete({ where: { id } });
  return ok({ deleted: true });
}
