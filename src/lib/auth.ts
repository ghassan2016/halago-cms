import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "halago-dev-secret-change-me"
);
const COOKIE_NAME = "halago_session";
const MAX_AGE = 60 * 60 * 24 * 7; // أسبوع

export interface SessionPayload {
  sub: string; // admin id
  name: string;
  email: string;
  role: string;
  [key: string]: unknown;
}

/** توقيع توكن JWT */
export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(SECRET);
}

/** التحقق من توكن JWT */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

/** كتابة كوكي الجلسة (httpOnly) */
export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

/** حذف كوكي الجلسة */
export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

/** قراءة الجلسة الحالية من الكوكي (للـ server components / route handlers) */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export const SESSION_COOKIE = COOKIE_NAME;
