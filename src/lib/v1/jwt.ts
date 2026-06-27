// JWT bearer tokens للموبايل (منفصلة عن admin cookie في src/lib/auth.ts)
// Access token: 7 أيام، Refresh token: 30 يوم. الاثنان stateless (signed) للبساطة.
import { SignJWT, jwtVerify } from "jose";

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.MOBILE_JWT_SECRET || "halago-mobile-dev-secret-change-me",
);
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.MOBILE_REFRESH_SECRET ||
    process.env.MOBILE_JWT_SECRET ||
    "halago-mobile-refresh-secret-change-me",
);

const ACCESS_TTL = "7d";
const REFRESH_TTL = "30d";

export type MobileRole = "customer" | "driver";

export interface MobileAccessPayload {
  sub: string; // user id (string of numeric Customer/Driver id)
  role: MobileRole;
  iat?: number;
  exp?: number;
}

export interface MobileRefreshPayload extends MobileAccessPayload {
  type: "refresh";
}

export async function signAccessToken(payload: {
  userId: number;
  role: MobileRole;
}): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(ACCESS_SECRET);
}

export async function signRefreshToken(payload: {
  userId: number;
  role: MobileRole;
}): Promise<string> {
  return new SignJWT({ role: payload.role, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setExpirationTime(REFRESH_TTL)
    .sign(REFRESH_SECRET);
}

export async function verifyAccessToken(
  token: string,
): Promise<MobileAccessPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    if (!payload.sub || (payload as { role?: string }).role == null) return null;
    return {
      sub: String(payload.sub),
      role: (payload as { role: MobileRole }).role,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(
  token: string,
): Promise<MobileRefreshPayload | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);
    if ((payload as { type?: string }).type !== "refresh") return null;
    return {
      sub: String(payload.sub),
      role: (payload as { role: MobileRole }).role,
      type: "refresh",
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
