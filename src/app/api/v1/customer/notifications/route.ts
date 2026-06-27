import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { okV1, requireV1Auth } from "@/lib/v1/api";

export async function GET(req: NextRequest) {
  const auth = await requireV1Auth(req, { role: "customer" });
  if ("error" in auth) return auth.error;

  // الإشعارات العامة (audience=all) + للعملاء — model Notification الحالي ليس per-user
  // مستقبلاً نضيف UserNotification لكل user
  const items = await prisma.notification.findMany({
    where: { audience: { in: ["all", "customers"] } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return okV1({
    items: items.map((n) => ({
      id: String(n.id),
      title: n.title,
      body: n.body,
      createdAt: n.createdAt,
      read: false, // مستقبلاً من جدول قراءة
    })),
    unreadCount: items.length,
  });
}
