import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, parseListParams, buildMeta } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const auth = await requireModule("reviews");
  if ("error" in auth) return auth.error;

  const { page, perPage, search, skip } = parseListParams(req.url);
  const { searchParams } = new URL(req.url);
  const stars = searchParams.get("stars"); // فلترة بعدد النجوم
  const hidden = searchParams.get("hidden"); // "true" | "false"

  const where: any = {};
  if (search) {
    where.OR = [
      { comment: { contains: search, mode: "insensitive" } },
      { toName: { contains: search, mode: "insensitive" } },
      { fromName: { contains: search, mode: "insensitive" } },
      { tripNo: { contains: search, mode: "insensitive" } },
    ];
  }
  if (stars) where.stars = Number(stars);
  if (hidden === "true") where.hidden = true;
  if (hidden === "false") where.hidden = false;

  const [total, reviews, avg] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({ where, skip, take: perPage, orderBy: { createdAt: "desc" } }),
    prisma.review.aggregate({ where: { hidden: false }, _avg: { stars: true }, _count: true }),
  ]);

  return ok(
    { reviews, avgStars: avg._avg.stars ?? 0, totalReviews: avg._count },
    buildMeta(total, page, perPage)
  );
}
