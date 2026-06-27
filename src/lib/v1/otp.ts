import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendSms } from "./sms";

const OTP_TTL_SECONDS = 300; // 5 دقائق
const OTP_LENGTH = 6;
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  // OTP عشوائي مكوّن من 6 أرقام
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH;
  return String(Math.floor(min + Math.random() * (max - min)));
}

function generateSessionId(): string {
  // معرّف جلسة قصير وعشوائي
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

interface CreateOtpResult {
  sessionId: string;
  expiresIn: number;
  /** الرمز نفسه — يُرجَع في dev mode فقط لتسهيل الاختبار */
  devCode?: string;
}

export async function createOtp(params: {
  phone: string;
  role: "customer" | "driver";
}): Promise<CreateOtpResult> {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 8);
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  // إلغاء OTP قديم لنفس الرقم/الدور (سواء انتهى أو لم يستهلك)
  await prisma.otpCode.updateMany({
    where: { phone: params.phone, role: params.role, consumed: false },
    data: { consumed: true },
  });

  await prisma.otpCode.create({
    data: {
      sessionId,
      phone: params.phone,
      role: params.role,
      codeHash,
      expiresAt,
    },
  });

  const isDev = (process.env.MOBILE_SMS_PROVIDER || "console") === "console";
  const messageAr = `رمز HalaGo: ${code} — صالح لـ 5 دقائق`;
  await sendSms({ phone: params.phone, message: messageAr });

  return {
    sessionId,
    expiresIn: OTP_TTL_SECONDS,
    devCode: isDev ? code : undefined,
  };
}

export type OtpVerifyResult =
  | { ok: true; phone: string; role: "customer" | "driver" }
  | { ok: false; code: "NOT_FOUND" | "EXPIRED" | "ATTEMPTS_EXCEEDED" | "INVALID" };

export async function verifyOtp(params: {
  sessionId: string;
  code: string;
}): Promise<OtpVerifyResult> {
  const record = await prisma.otpCode.findUnique({
    where: { sessionId: params.sessionId },
  });
  if (!record) return { ok: false, code: "NOT_FOUND" };
  if (record.consumed) return { ok: false, code: "NOT_FOUND" };
  if (record.expiresAt.getTime() < Date.now()) {
    return { ok: false, code: "EXPIRED" };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false, code: "ATTEMPTS_EXCEEDED" };
  }

  const match = await bcrypt.compare(params.code, record.codeHash);
  if (!match) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, code: "INVALID" };
  }

  await prisma.otpCode.update({
    where: { id: record.id },
    data: { consumed: true },
  });

  return {
    ok: true,
    phone: record.phone,
    role: record.role as "customer" | "driver",
  };
}
