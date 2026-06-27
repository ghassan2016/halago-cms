import { NextRequest } from "next/server";
import { ERRORS, okV1 } from "@/lib/v1/api";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/v1/jwt";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  let body: { refreshToken?: string };
  try {
    body = await req.json();
  } catch {
    return ERRORS.validation("body غير صالح");
  }

  const token = body.refreshToken;
  if (!token) return ERRORS.unauthorized();

  const payload = await verifyRefreshToken(token);
  if (!payload) return ERRORS.unauthorized();

  const userId = Number(payload.sub);
  if (!Number.isFinite(userId) || userId <= 0) return ERRORS.unauthorized();

  // تأكّد أن المستخدم لا يزال موجوداً ونشطاً
  if (payload.role === "customer") {
    const c = await prisma.customer.findUnique({ where: { id: userId } });
    if (!c || !c.active) return ERRORS.unauthorized();
  } else {
    const d = await prisma.driver.findUnique({ where: { id: userId } });
    if (!d) return ERRORS.unauthorized();
    if (d.status === "suspended") return ERRORS.blocked();
  }

  const newAccess = await signAccessToken({ userId, role: payload.role });
  const newRefresh = await signRefreshToken({ userId, role: payload.role });

  return okV1({ token: newAccess, refreshToken: newRefresh });
}
