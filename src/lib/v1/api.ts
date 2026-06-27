// Helpers موحّدة لطبقة /api/v1/* — صيغة الرد متوافقة مع dio_client.dart في تطبيقَي Flutter.
// success: { success: true, data: ... }
// error:   { success: false, error: { code, message, messageEn?, details? } }
import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, type MobileRole } from "./jwt";

export function okV1<T>(data: T, meta?: unknown) {
  return NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) });
}

export interface V1ErrorOptions {
  code: string;
  message: string;
  messageEn?: string;
  status?: number;
  details?: Record<string, unknown>;
}

export function failV1(opts: V1ErrorOptions) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: opts.code,
        message: opts.message,
        messageEn: opts.messageEn,
        details: opts.details,
      },
    },
    { status: opts.status ?? 400 },
  );
}

export const ERRORS = {
  invalidPhone: () =>
    failV1({
      code: "INVALID_PHONE",
      message: "رقم الجوّال غير صالح",
      messageEn: "Invalid phone number",
      status: 422,
    }),
  invalidOtp: () =>
    failV1({
      code: "INVALID_OTP",
      message: "الرمز غير صحيح",
      messageEn: "Invalid OTP code",
      status: 401,
    }),
  otpExpired: () =>
    failV1({
      code: "OTP_EXPIRED",
      message: "انتهت صلاحية الرمز — اطلب رمزاً جديداً",
      messageEn: "OTP expired",
      status: 401,
    }),
  rateLimited: (seconds: number) =>
    failV1({
      code: "RATE_LIMITED",
      message: `محاولات كثيرة، انتظر ${seconds} ثانية`,
      messageEn: `Too many attempts — wait ${seconds}s`,
      status: 429,
    }),
  unauthorized: () =>
    failV1({
      code: "UNAUTHORIZED",
      message: "يجب تسجيل الدخول أولاً",
      messageEn: "Unauthorized",
      status: 401,
    }),
  forbidden: () =>
    failV1({
      code: "FORBIDDEN",
      message: "لا تملك صلاحية الوصول",
      messageEn: "Forbidden",
      status: 403,
    }),
  blocked: () =>
    failV1({
      code: "BLOCKED",
      message: "هذا الحساب محظور — تواصل مع الدعم",
      messageEn: "This account is blocked",
      status: 403,
    }),
  notFound: (what = "المورد") =>
    failV1({
      code: "NOT_FOUND",
      message: `${what} غير موجود`,
      messageEn: "Not found",
      status: 404,
    }),
  validation: (message: string, details?: Record<string, unknown>) =>
    failV1({
      code: "VALIDATION_ERROR",
      message,
      messageEn: "Validation error",
      status: 422,
      details,
    }),
  serverError: (err?: unknown) =>
    failV1({
      code: "SERVER_ERROR",
      message: "حدث خطأ غير متوقع",
      messageEn: "Server error",
      status: 500,
      details: process.env.NODE_ENV === "production" ? undefined : { raw: String(err) },
    }),
};

export interface MobileSession {
  userId: number;
  role: MobileRole;
}

/**
 * يستخرج Bearer JWT من الـ header ويتحقّق منه.
 * يستخدم داخل route handler:
 *
 *   const auth = await requireV1Auth(req);
 *   if ("error" in auth) return auth.error;
 *   const { userId, role } = auth.session;
 */
export async function requireV1Auth(
  req: NextRequest,
  opts?: { role?: MobileRole },
): Promise<{ session: MobileSession } | { error: NextResponse }> {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return { error: ERRORS.unauthorized() };
  }
  const token = header.slice(7).trim();
  const payload = await verifyAccessToken(token);
  if (!payload) return { error: ERRORS.unauthorized() };

  const userId = Number(payload.sub);
  if (!Number.isFinite(userId) || userId <= 0) {
    return { error: ERRORS.unauthorized() };
  }
  if (opts?.role && payload.role !== opts.role) {
    return { error: ERRORS.forbidden() };
  }
  return { session: { userId, role: payload.role } };
}

/** يمرّر بعد عملية مكلِفة لقياس الأداء في الـ logs */
export function withTiming<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().finally(() => {
    const dur = Date.now() - start;
    if (dur > 500) console.warn(`[v1] slow ${label}: ${dur}ms`);
  });
}
