import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

// قائمة منتجات متجر
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("vendors");
  if ("error" in auth) return auth.error;

  const products = await prisma.product.findMany({
    where: { vendorId: Number(params.id) },
    orderBy: { createdAt: "desc" },
  });
  return ok(products);
}

// إضافة منتج لمتجر
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("vendors");
  if ("error" in auth) return auth.error;

  const vendorId = Number(params.id);
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) return fail("المتجر غير موجود", 404);

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  const price = Number(body?.price);
  if (!name) return fail("اسم المنتج مطلوب", 422);
  if (!Number.isFinite(price) || price < 0) return fail("سعر غير صالح", 422);

  const product = await prisma.product.create({
    data: {
      vendorId,
      name,
      price,
      category: body?.category ? String(body.category) : null,
      image: body?.image ? String(body.image) : null,
      available: typeof body?.available === "boolean" ? body.available : true,
    },
  });

  await logAudit(auth.session, "create_product", "product", product.id, { vendorId, name });
  return ok(product);
}
