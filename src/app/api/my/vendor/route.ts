import { prisma } from "@/lib/prisma";
import { requireVendor, ok, fail } from "@/lib/api-helpers";

// ملف المتجر الخاص بالتاجر المسجّل + إحصائيات سريعة
export async function GET() {
  const auth = await requireVendor();
  if ("error" in auth) return auth.error;

  const vendor = await prisma.vendor.findUnique({ where: { id: auth.vendorId } });
  if (!vendor) return fail("المتجر غير موجود", 404);

  const [products, orders, revenueAgg] = await Promise.all([
    prisma.product.count({ where: { vendorId: auth.vendorId } }),
    prisma.trip.count({ where: { vendorId: auth.vendorId, type: "delivery" } }),
    prisma.trip.aggregate({
      where: { vendorId: auth.vendorId, type: "delivery", status: "completed" },
      _sum: { fare: true },
    }),
  ]);

  return ok({ ...vendor, _stats: { products, orders, revenue: revenueAgg._sum.fare ?? 0 } });
}
