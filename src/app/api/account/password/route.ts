import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth, ok, fail } from "@/lib/api-helpers";

// تغيير كلمة مرور الأدمن الحالي
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const current = String(body?.current || "");
  const next = String(body?.next || "");

  if (!current || !next) return fail("كلمة المرور الحالية والجديدة مطلوبتان", 422);
  if (next.length < 6) return fail("كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف", 422);

  const admin = await prisma.admin.findUnique({ where: { id: Number(auth.session.sub) } });
  if (!admin) return fail("الحساب غير موجود", 404);

  const valid = await bcrypt.compare(current, admin.password);
  if (!valid) return fail("كلمة المرور الحالية غير صحيحة", 422);

  await prisma.admin.update({
    where: { id: admin.id },
    data: { password: await bcrypt.hash(next, 10) },
  });
  return ok({ changed: true });
}
