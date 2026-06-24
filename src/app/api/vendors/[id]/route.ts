import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("vendors");
  if ("error" in auth) return auth.error;

  const vendor = await prisma.vendor.findUnique({
    where: { id: Number(params.id) },
    include: {
      products: { orderBy: { createdAt: "desc" } },
      _count: { select: { products: true, trips: true } },
    },
  });
  if (!vendor) return fail("المتجر غير موجود", 404);
  return ok(vendor);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("vendors");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.status === "string") data.status = body.status;
  if (body.commission !== undefined) data.commission = Number(body.commission);
  if (Object.keys(data).length === 0) return fail("لا توجد بيانات للتحديث", 422);

  const vendor = await prisma.vendor.update({ where: { id: Number(params.id) }, data });
  return ok(vendor);
}
