import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVendor, ok, fail } from "@/lib/api-helpers";

// منتجات المتجر الخاص بالتاجر
export async function GET() {
  const auth = await requireVendor();
  if ("error" in auth) return auth.error;

  const products = await prisma.product.findMany({
    where: { vendorId: auth.vendorId },
    orderBy: { createdAt: "desc" },
  });
  return ok(products);
}

// إضافة منتج لمتجر التاجر
export async function POST(req: NextRequest) {
  const auth = await requireVendor();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  const price = Number(body?.price);
  if (!name) return fail("اسم المنتج مطلوب", 422);
  if (!Number.isFinite(price) || price < 0) return fail("سعر غير صالح", 422);

  const product = await prisma.product.create({
    data: {
      vendorId: auth.vendorId,
      name,
      price,
      category: body?.category ? String(body.category) : null,
      available: typeof body?.available === "boolean" ? body.available : true,
    },
  });
  return ok(product);
}
