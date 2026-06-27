import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { okV1, requireV1Auth } from "@/lib/v1/api";

export async function POST(req: NextRequest) {
  // لا نخزّن tokens في DB (stateless) — كل ما نفعله هنا تعطيل DeviceTokens النشطة للجلسة.
  const auth = await requireV1Auth(req);
  if ("error" in auth) {
    // حتى لو غير مصرّح، نُرجع نجاحاً صامتاً — العميل يمسح الـ tokens محلياً
    return okV1({ loggedOut: true });
  }

  try {
    await prisma.deviceToken.updateMany({
      where: {
        ownerType: auth.session.role,
        ownerId: auth.session.userId,
      },
      data: { active: false },
    });
  } catch {
    // ignore — best-effort
  }

  return okV1({ loggedOut: true });
}
