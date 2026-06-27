import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ERRORS, okV1, requireV1Auth } from "@/lib/v1/api";

// POST /api/v1/devices — تسجيل FCM token
export async function POST(req: NextRequest) {
  const auth = await requireV1Auth(req);
  if ("error" in auth) return auth.error;

  let body: {
    token?: string;
    platform?: string;
    locale?: string;
    appVersion?: string;
  };
  try {
    body = await req.json();
  } catch {
    return ERRORS.validation("body غير صالح");
  }

  if (!body.token || body.token.length < 16) {
    return ERRORS.validation("token غير صالح");
  }
  const platform = body.platform === "ios" ? "ios" : "android";
  const locale = body.locale === "en" ? "en" : "ar";

  try {
    const existing = await prisma.deviceToken.findUnique({
      where: { token: body.token },
    });
    if (existing) {
      await prisma.deviceToken.update({
        where: { id: existing.id },
        data: {
          ownerType: auth.session.role,
          ownerId: auth.session.userId,
          platform,
          locale,
          appVersion: body.appVersion,
          active: true,
          lastSeenAt: new Date(),
        },
      });
      return okV1({ id: String(existing.id) });
    }
    const created = await prisma.deviceToken.create({
      data: {
        ownerType: auth.session.role,
        ownerId: auth.session.userId,
        token: body.token,
        platform,
        locale,
        appVersion: body.appVersion,
      },
    });
    return okV1({ id: String(created.id) });
  } catch (err) {
    return ERRORS.serverError(err);
  }
}
