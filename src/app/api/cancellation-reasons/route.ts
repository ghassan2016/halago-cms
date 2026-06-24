import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";

/** GET /api/cancellation-reasons — قائمة الأسباب (مرتّبة) */
export async function GET() {
  const auth = await requireModule("cancellations");
  if ("error" in auth) return auth.error;

  const reasons = await prisma.cancellationReason.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return ok(reasons);
}

/** POST /api/cancellation-reasons — إضافة سبب جديد */
export async function POST(req: NextRequest) {
  const auth = await requireModule("cancellations");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const key = String(body?.key || "").trim();
  const labelAr = String(body?.labelAr || "").trim();
  const labelEn = String(body?.labelEn || "").trim();
  const audience = String(body?.audience || "both");
  const sortOrder = Number(body?.sortOrder ?? 0);

  if (!key || !/^[a-z0-9_]+$/.test(key)) return fail("المفتاح غير صالح (a-z0-9_ فقط)", 422);
  if (!labelAr || !labelEn) return fail("العنوانان مطلوبان", 422);
  if (!["driver", "customer", "both"].includes(audience)) return fail("جمهور غير صالح", 422);

  const exists = await prisma.cancellationReason.findUnique({ where: { key } });
  if (exists) return fail("هذا المفتاح مستخدم مسبقاً", 409);

  const reason = await prisma.cancellationReason.create({
    data: { key, labelAr, labelEn, audience, sortOrder, active: true },
  });
  return ok(reason);
}
