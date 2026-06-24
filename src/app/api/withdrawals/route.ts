import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, parseListParams, buildMeta } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const auth = await requireModule("withdrawals");
  if ("error" in auth) return auth.error;

  const { page, perPage, status, skip } = parseListParams(req.url);
  const where: any = {};
  if (status) where.status = status;

  const [total, withdrawals] = await Promise.all([
    prisma.withdrawalRequest.count({ where }),
    prisma.withdrawalRequest.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { createdAt: "desc" },
      include: { driver: { select: { id: true, name: true, phone: true, walletBalance: true } } },
    }),
  ]);

  return ok(withdrawals, buildMeta(total, page, perPage));
}
