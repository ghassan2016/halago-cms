import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail, parseListParams, buildMeta } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requireModule("users");
  if ("error" in auth) return auth.error;

  const { page, perPage, search, skip } = parseListParams(req.url);

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({ where, skip, take: perPage, orderBy: { createdAt: "desc" } }),
  ]);

  return ok(customers, buildMeta(total, page, perPage));
}

// POST /api/customers — إضافة عميل يدوياً من الداشبورد
export async function POST(req: NextRequest) {
  const auth = await requireModule("users");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  const phone = String(body?.phone || "").trim();
  const email = String(body?.email || "").trim() || null;
  const city = String(body?.city || "").trim() || null;

  if (!name) return fail("الاسم مطلوب", 422);
  if (!phone) return fail("رقم الهاتف مطلوب", 422);

  const dupe = await prisma.customer.findFirst({
    where: { OR: [{ phone }, ...(email ? [{ email }] : [])] },
  });
  if (dupe) return fail("يوجد عميل بنفس الهاتف أو البريد", 409);

  const customer = await prisma.customer.create({ data: { name, phone, email, city } });
  await logAudit(auth.session, "create_customer", "customer", customer.id, { name, phone });
  return ok(customer);
}
