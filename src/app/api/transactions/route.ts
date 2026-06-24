import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, parseListParams, buildMeta } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const auth = await requireModule("finance");
  if ("error" in auth) return auth.error;

  const { page, perPage, type, skip } = parseListParams(req.url);
  const where: any = {};
  if (type) where.type = type;

  const [total, transactions, sums] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({ where, skip, take: perPage, orderBy: { createdAt: "desc" } }),
    prisma.transaction.groupBy({ by: ["type"], _sum: { amount: true } }),
  ]);

  const totals = sums.reduce<Record<string, number>>((acc, s) => {
    acc[s.type] = Number((s._sum.amount || 0).toFixed(2));
    return acc;
  }, {});

  return ok({ transactions, totals }, buildMeta(total, page, perPage));
}
