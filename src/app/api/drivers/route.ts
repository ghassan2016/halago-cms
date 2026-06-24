import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, parseListParams, buildMeta } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const auth = await requireModule("drivers");
  if ("error" in auth) return auth.error;

  const { page, perPage, search, status, skip } = parseListParams(req.url);

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
    ];
  }
  if (status) where.status = status;

  const [total, drivers] = await Promise.all([
    prisma.driver.count({ where }),
    prisma.driver.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return ok(drivers, buildMeta(total, page, perPage));
}
