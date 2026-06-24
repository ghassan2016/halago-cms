import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, parseListParams, buildMeta } from "@/lib/api-helpers";

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
