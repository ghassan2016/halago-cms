import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail, parseListParams, buildMeta } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const auth = await requireModule("notifications");
  if ("error" in auth) return auth.error;

  const { page, perPage, skip } = parseListParams(req.url);
  const [total, items] = await Promise.all([
    prisma.notification.count(),
    prisma.notification.findMany({ skip, take: perPage, orderBy: { createdAt: "desc" } }),
  ]);
  return ok(items, buildMeta(total, page, perPage));
}

// إرسال إشعار جماعي (يحسب عدد المستلمين الفعلي من قاعدة البيانات)
export async function POST(req: NextRequest) {
  const auth = await requireModule("notifications");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const title = String(body?.title || "").trim();
  const text = String(body?.body || "").trim();
  const audience = ["all", "drivers", "customers"].includes(body?.audience) ? body.audience : "all";

  if (!title || !text) return fail("العنوان والنص مطلوبان", 422);

  let recipients = 0;
  if (audience === "drivers") {
    recipients = await prisma.driver.count();
  } else if (audience === "customers") {
    recipients = await prisma.customer.count();
  } else {
    const [d, c] = await Promise.all([prisma.driver.count(), prisma.customer.count()]);
    recipients = d + c;
  }

  const notification = await prisma.notification.create({
    data: { title, body: text, audience, recipients, sentBy: auth.session.name },
  });
  return ok(notification);
}
