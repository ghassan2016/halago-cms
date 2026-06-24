import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, parseListParams, buildMeta } from "@/lib/api-helpers";

/** GET /api/referral-codes — قائمة أكواد الإحالة */
export async function GET(req: NextRequest) {
  const auth = await requireModule("referrals");
  if ("error" in auth) return auth.error;

  const { page, perPage, search, skip } = parseListParams(req.url);
  const url = new URL(req.url);
  const ownerType = url.searchParams.get("ownerType") || "";

  const where: any = {};
  if (search) {
    where.OR = [
      { code: { contains: search } },
      { ownerName: { contains: search } },
    ];
  }
  if (ownerType) where.ownerType = ownerType;

  const [total, codes] = await Promise.all([
    prisma.referralCode.count({ where }),
    prisma.referralCode.findMany({
      where,
      skip,
      take: perPage,
      orderBy: [{ usageCount: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return ok({ codes }, buildMeta(total, page, perPage));
}
