import { prisma } from "@/lib/prisma";
import { requireAuth, ok, fail } from "@/lib/api-helpers";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const admin = await prisma.admin.findUnique({
    where: { id: Number(auth.session.sub) },
    select: { id: true, name: true, email: true, role: true, avatar: true, vendorId: true },
  });
  if (!admin) return fail("الحساب غير موجود", 404);

  return ok(admin);
}
