import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok } from "@/lib/api-helpers";

// قائمة السائقين المعتمدين (لإعادة التعيين اليدوي) — المتاحون أولاً
export async function GET(req: NextRequest) {
  const auth = await requireModule("drivers");
  if ("error" in auth) return auth.error;

  const drivers = await prisma.driver.findMany({
    where: { status: "approved" },
    select: { id: true, name: true, phone: true, available: true, rating: true, city: true, vehicleType: true },
    orderBy: [{ available: "desc" }, { rating: "desc" }],
    take: 100,
  });

  return ok(drivers);
}
