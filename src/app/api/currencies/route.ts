import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";

/** GET /api/currencies — قائمة العملات المدعومة */
export async function GET() {
  const auth = await requireModule("settings");
  if ("error" in auth) return auth.error;
  const currencies = await prisma.currency.findMany({ orderBy: [{ isBase: "desc" }, { sortOrder: "asc" }, { code: "asc" }] });
  return ok(currencies);
}

/** POST /api/currencies — إضافة عملة جديدة */
export async function POST(req: NextRequest) {
  const auth = await requireModule("settings");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const code = String(body?.code || "").trim().toUpperCase();
  const name = String(body?.name || "").trim();
  const nameAr = String(body?.nameAr || "").trim();
  const symbol = String(body?.symbol || "").trim();
  const fxRate = Number(body?.fxRate || 1);

  if (!/^[A-Z]{3}$/.test(code)) return fail("رمز العملة يجب أن يكون 3 أحرف (ISO 4217)", 422);
  if (!name || !nameAr || !symbol) return fail("الحقول مطلوبة", 422);
  if (fxRate <= 0) return fail("سعر الصرف يجب أن يكون موجباً", 422);

  const exists = await prisma.currency.findUnique({ where: { code } });
  if (exists) return fail("هذه العملة موجودة مسبقاً", 409);

  const c = await prisma.currency.create({
    data: { code, name, nameAr, symbol, fxRate, active: true },
  });
  return ok(c);
}
