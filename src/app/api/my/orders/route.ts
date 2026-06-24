import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVendor, ok, parseListParams, buildMeta } from "@/lib/api-helpers";

// الطلبات الواردة لمتجر التاجر (رحلات التوصيل)
export async function GET(req: NextRequest) {
  const auth = await requireVendor();
  if ("error" in auth) return auth.error;

  const { page, perPage, search, status, skip } = parseListParams(req.url);

  const where: any = { vendorId: auth.vendorId, type: "delivery" };
  if (status) where.status = status;
  if (search) where.number = { contains: search };

  const [total, orders] = await Promise.all([
    prisma.trip.count({ where }),
    prisma.trip.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        driver: { select: { id: true, name: true, phone: true } },
      },
    }),
  ]);

  return ok(orders, buildMeta(total, page, perPage));
}
