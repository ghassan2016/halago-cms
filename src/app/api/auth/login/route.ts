import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signSession, setSessionCookie } from "@/lib/auth";
import { ok, fail } from "@/lib/api-helpers";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // 8 محاولات لكل IP خلال دقيقة — يحمي من تخمين كلمة المرور
  const limited = checkRateLimit(req, { max: 8, windowMs: 60_000, key: "login" });
  if (limited) return limited;

  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!email || !password) {
      return fail("البريد الإلكتروني وكلمة المرور مطلوبان", 422);
    }

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin || !admin.active) {
      return fail("بيانات الدخول غير صحيحة", 401);
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return fail("بيانات الدخول غير صحيحة", 401);
    }

    const token = await signSession({
      sub: String(admin.id),
      name: admin.name,
      email: admin.email,
      role: admin.role,
      vendorId: admin.vendorId ?? null,
    });
    setSessionCookie(token);

    return ok({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      avatar: admin.avatar,
      vendorId: admin.vendorId ?? null,
    });
  } catch (e) {
    return fail("حدث خطأ في الخادم", 500);
  }
}
