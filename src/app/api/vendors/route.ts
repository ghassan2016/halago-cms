import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail, parseListParams, buildMeta } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const auth = await requireModule("vendors");
  if ("error" in auth) return auth.error;

  const { page, perPage, search, status, skip } = parseListParams(req.url);
  const where: any = {};
  if (search) where.OR = [{ name: { contains: search } }, { address: { contains: search } }];
  if (status) where.status = status;

  const [total, vendors] = await Promise.all([
    prisma.vendor.count({ where }),
    prisma.vendor.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { products: true, trips: true } } },
    }),
  ]);

  return ok(vendors, buildMeta(total, page, perPage));
}

// إنشاء متجر
export async function POST(req: NextRequest) {
  const auth = await requireModule("vendors");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  if (!body?.name) return fail("اسم المتجر مطلوب", 422);

  const vendor = await prisma.vendor.create({
    data: {
      name: String(body.name),
      category: body.category || "restaurant",
      status: body.status || "open",
      commission: Number(body.commission ?? 15),
      address: body.address || null,
      phone: body.phone || null,
    },
  });
  return ok(vendor);
}
