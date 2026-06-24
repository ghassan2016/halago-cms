import { prisma } from "@/lib/prisma";
import { requireModule, ok } from "@/lib/api-helpers";

/**
 * مواقع السائقين المتصلين لحظياً.
 * عند كل استدعاء نحرّك مواقعهم قليلاً (محاكاة الحركة الحيّة) ونحفظها،
 * بحيث تتحرّك العلامات على الخريطة مع كل تحديث (polling).
 */
export async function GET() {
  const auth = await requireModule("map");
  if ("error" in auth) return auth.error;

  const drivers = await prisma.driver.findMany({
    where: { status: "approved", available: true, lat: { not: null }, lng: { not: null } },
    select: { id: true, name: true, lat: true, lng: true, vehicleType: true, rating: true, city: true, phone: true },
  });

  // تحريك بسيط لكل سائق (±~150م) لمحاكاة التتبّع اللحظي
  const moved = drivers.map((d) => ({
    ...d,
    lat: (d.lat as number) + (Math.random() - 0.5) * 0.003,
    lng: (d.lng as number) + (Math.random() - 0.5) * 0.003,
  }));

  await prisma.$transaction(
    moved.map((d) => prisma.driver.update({ where: { id: d.id }, data: { lat: d.lat, lng: d.lng } }))
  );

  return ok(moved);
}
