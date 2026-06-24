import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";

export async function GET() {
  const auth = await requireModule("pricing");
  if ("error" in auth) return auth.error;

  const rules = await prisma.pricingRule.findMany({ orderBy: [{ serviceType: "asc" }, { vehicleType: "asc" }] });
  return ok(rules);
}

// حفظ/تحديث قاعدة (upsert حسب vehicleType+serviceType)
export async function PUT(req: NextRequest) {
  const auth = await requireModule("pricing");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const list = Array.isArray(body?.rules) ? body.rules : [body];

  const saved = [];
  for (const r of list) {
    if (!r?.vehicleType) continue;
    const serviceType = r.serviceType || "ride";
    const data = {
      distanceUnit: r.distanceUnit === "mile" ? "mile" : "km",
      baseFare: Number(r.baseFare ?? 0),
      bookingFee: Number(r.bookingFee ?? 0),
      perKm: Number(r.perKm ?? 0),
      perMinute: Number(r.perMinute ?? 0),
      waitPerMinute: Number(r.waitPerMinute ?? 0),
      freeWaitMinutes: Number(r.freeWaitMinutes ?? 0),
      minimumFare: Number(r.minimumFare ?? 0),
      cancellationFee: Number(r.cancellationFee ?? 0),
      taxPercent: Number(r.taxPercent ?? 0),
      currency: r.currency || "ر.س",
      active: r.active !== false,
    };
    const rule = await prisma.pricingRule.upsert({
      where: { vehicleType_serviceType: { vehicleType: r.vehicleType, serviceType } },
      update: data,
      create: { vehicleType: r.vehicleType, serviceType, ...data },
    });
    saved.push(rule);
  }
  if (saved.length === 0) return fail("لا توجد قواعد صالحة للحفظ", 422);
  return ok(saved);
}
