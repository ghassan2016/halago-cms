import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, parseListParams, buildMeta } from "@/lib/api-helpers";

/** GET /api/referrals — قائمة الإحالات + إحصائيات إجمالية */
export async function GET(req: NextRequest) {
  const auth = await requireModule("referrals");
  if ("error" in auth) return auth.error;

  const { page, perPage, search, status, skip } = parseListParams(req.url);

  const where: any = {};
  if (search) {
    where.OR = [
      { code: { contains: search } },
      { referrerName: { contains: search } },
      { refereeName: { contains: search } },
    ];
  }
  if (status) where.status = status;

  const [total, referrals, completedReferrals, rewardAgg] = await Promise.all([
    prisma.referral.count({ where }),
    prisma.referral.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { createdAt: "desc" },
    }),
    prisma.referral.count({ where: { status: { in: ["completed", "rewarded"] } } }),
    prisma.referral.aggregate({
      where: { status: "rewarded" },
      _sum: { reward: true },
    }),
  ]);

  return ok(
    {
      referrals,
      totalReferrals: total,
      completedReferrals,
      totalRewards: Number((rewardAgg._sum.reward || 0).toFixed(2)),
    },
    buildMeta(total, page, perPage)
  );
}
