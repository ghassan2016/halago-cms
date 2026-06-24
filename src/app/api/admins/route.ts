import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole, ok, fail } from "@/lib/api-helpers";

const ROLES = ["super_admin", "operations", "finance", "support"];

export async function GET() {
  const auth = await requireRole(["super_admin"]);
  if ("error" in auth) return auth.error;

  const admins = await prisma.admin.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });
  return ok(admins);
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(["super_admin"]);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const role = ROLES.includes(body?.role) ? body.role : "support";

  if (!name || !email || !password) return fail("الاسم والبريد وكلمة المرور مطلوبة", 422);

  const exists = await prisma.admin.findUnique({ where: { email } });
  if (exists) return fail("البريد مستخدم مسبقاً", 409);

  const admin = await prisma.admin.create({
    data: { name, email, password: await bcrypt.hash(password, 10), role },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });
  return ok(admin);
}
