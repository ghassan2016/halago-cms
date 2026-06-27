import { prisma } from "@/lib/prisma";
import { computeTier } from "@/lib/tier";

/**
 * يعيد حساب متوسط تقييم سائق أو عميل بناءً على المراجعات الظاهرة فقط (hidden=false).
 * يُستدعى بعد إخفاء/إظهار/حذف مراجعة حتى لا يبقى تقييم ظالم محتسَباً.
 */
export async function recomputeRating(toType: string, toId: number | null | undefined) {
  if (!toId || (toType !== "driver" && toType !== "customer")) return;

  const agg = await prisma.review.aggregate({
    where: { toType, toId, hidden: false },
    _avg: { stars: true },
    _count: true,
  });

  // لو ما في مراجعات ظاهرة نرجع للقيمة الافتراضية 5
  const rating = agg._count > 0 ? Math.round((agg._avg.stars ?? 5) * 100) / 100 : 5;

  if (toType === "driver") {
    const driver = await prisma.driver.findUnique({ where: { id: toId } });
    const tier = computeTier(rating, driver?.totalTrips ?? 0);
    await prisma.driver.update({ where: { id: toId }, data: { rating, tier } }).catch(() => {});
  } else {
    await prisma.customer.update({ where: { id: toId }, data: { rating } }).catch(() => {});
  }
  return rating;
}
