import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ERRORS, okV1 } from "@/lib/v1/api";
import { createOtp } from "@/lib/v1/otp";
import { normalizeSaudiPhone } from "@/lib/v1/phone";

export async function POST(req: NextRequest) {
  // حدّ: 5 طلبات / دقيقة لكل IP — يمنع flooding
  const limited = checkRateLimit(req, {
    max: 5,
    windowMs: 60_000,
    key: "v1-send-otp",
  });
  if (limited) {
    return ERRORS.rateLimited(60);
  }

  let body: { phone?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return ERRORS.validation("body غير صالح");
  }

  const phone = normalizeSaudiPhone(body.phone);
  if (!phone) return ERRORS.invalidPhone();

  const role = body.role === "driver" ? "driver" : "customer";

  // التحقّق من حظر الرقم
  const blocked = await prisma.blockedEntity.findFirst({
    where: { kind: "phone", value: phone, active: true },
  });
  if (blocked) return ERRORS.blocked();

  // للسائق فقط: تأكّد أنه مسجّل (لا نسمح بتسجيل سائقين جدد عبر OTP — يمرّون بـ /driver/register)
  // ✅ نسمح للراكب بإنشاء حساب جديد تلقائياً
  if (role === "driver") {
    const existing = await prisma.driver.findFirst({ where: { phone } });
    // في dev نسمح بإنشاء سائق جديد تلقائياً عند verify لتسهيل الاختبار
    // في production هذا الـ if يصبح صارماً (نرفض إن لم يكن مسجّلاً)
    if (!existing && process.env.NODE_ENV === "production") {
      return ERRORS.notFound("الحساب");
    }
  }

  try {
    const result = await createOtp({ phone, role });
    return okV1({
      sessionId: result.sessionId,
      expiresIn: result.expiresIn,
      // في dev mode فقط — التطبيق يتجاهله في production
      devCode: result.devCode,
    });
  } catch (err) {
    return ERRORS.serverError(err);
  }
}
