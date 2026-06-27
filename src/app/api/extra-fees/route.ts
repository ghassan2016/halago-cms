import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";

export async function GET() {
  const auth = await requireModule("pricing");
  if ("error" in auth) return auth.error;

  const fees = await prisma.extraFee.findMany({ orderBy: { createdAt: "asc" } });
  return ok(fees);
}

export async function POST(req: NextRequest) {
  const auth = await requireModule("pricing");
  if ("error" in auth) return auth.error;

  const b = await req.json().catch(() => ({}));
  const key = String(b?.key || "").trim().toLowerCase();
  const name = String(b?.name || "").trim();
  const amount = Number(b?.amount);
  if (!key || !name) return fail("المفتاح والاسم مطلوبان", 422);
  if (!(amount >= 0)) return fail("المبلغ غير صالح", 422);

  const exists = await prisma.extraFee.findUnique({ where: { key } });
  if (exists) return fail("المفتاح مستخدم مسبقاً", 409);

  // الربط الجغرافي: رسم عام (global) أو خاص بمنطقة (zone)
  const scope = b?.scope === "zone" ? "zone" : "global";
  const zoneId = scope === "zone" && b?.zoneId ? Number(b.zoneId) : null;
  if (scope === "zone" && !zoneId) return fail("يجب تحديد المنطقة للرسم الخاص", 422);

  const fee = await prisma.extraFee.create({
    data: { key, name, amount, scope, zoneId, active: b?.active !== false },
  });
  return ok(fee);
}
