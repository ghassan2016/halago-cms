import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail, parseListParams, buildMeta } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const auth = await requireModule("promotions");
  if ("error" in auth) return auth.error;

  const { page, perPage, search, status, skip } = parseListParams(req.url);
  const where: any = {};
  if (search) where.code = { contains: search };
  if (status) where.status = status;

  const [total, promos] = await Promise.all([
    prisma.promo.count({ where }),
    prisma.promo.findMany({ where, skip, take: perPage, orderBy: { createdAt: "desc" } }),
  ]);

  return ok(promos, buildMeta(total, page, perPage));
}

// إنشاء كوبون
export async function POST(req: NextRequest) {
  const auth = await requireModule("promotions");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const code = String(body?.code || "").trim().toUpperCase();
  if (!code) return fail("رمز الكوبون مطلوب", 422);
  if (!body?.value) return fail("قيمة الخصم مطلوبة", 422);

  const exists = await prisma.promo.findUnique({ where: { code } });
  if (exists) return fail("رمز الكوبون مستخدم مسبقاً", 409);

  const validToDays = Number(body.validToDays ?? 30);
  const promo = await prisma.promo.create({
    data: {
      code,
      type: body.type === "fixed" ? "fixed" : "percentage",
      value: Number(body.value),
      maxDiscount: body.maxDiscount ? Number(body.maxDiscount) : null,
      minOrder: Number(body.minOrder ?? 0),
      usageLimit: Number(body.usageLimit ?? 100),
      service: body.service || "all",
      validTo: new Date(Date.now() + validToDays * 86400000),
      status: "active",
    },
  });
  return ok(promo);
}
