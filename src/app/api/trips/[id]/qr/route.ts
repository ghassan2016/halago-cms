import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { zatcaQrDataUrl } from "@/lib/zatca";

/** GET /api/trips/[id]/qr — يرجع Data URL لرمز QR ZATCA للفاتورة */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("trips");
  if ("error" in auth) return auth.error;

  const trip = await prisma.trip.findUnique({ where: { id: Number(params.id) } });
  if (!trip) return fail("الرحلة غير موجودة", 404);

  // قراءة بيانات البائع من الإعدادات
  const settings = await prisma.setting.findMany({
    where: { key: { in: ["app_name", "vat_number"] } },
  });
  const sm = new Map(settings.map((s) => [s.key, s.value]));
  const sellerName = sm.get("app_name") || "HalaGo";
  const vatNumber = sm.get("vat_number") || "300000000000003"; // افتراضي تجريبي

  const total = Number(trip.fare || 0);
  const subtotal = total / 1.15;
  const vatAmount = Number((total - subtotal).toFixed(2));

  const dataUrl = await zatcaQrDataUrl({
    sellerName,
    vatNumber,
    timestamp: trip.createdAt,
    total,
    vatAmount,
  });

  return ok({ dataUrl });
}
