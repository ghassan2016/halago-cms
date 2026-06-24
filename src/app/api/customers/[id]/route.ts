import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("users");
  if ("error" in auth) return auth.error;

  const customer = await prisma.customer.findUnique({
    where: { id: Number(params.id) },
    include: { trips: { take: 10, orderBy: { createdAt: "desc" } } },
  });
  if (!customer) return fail("العميل غير موجود", 404);
  return ok(customer);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("users");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (Object.keys(data).length === 0) return fail("لا توجد بيانات للتحديث", 422);

  const customer = await prisma.customer.update({ where: { id: Number(params.id) }, data });
  return ok(customer);
}
