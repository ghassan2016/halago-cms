import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ERRORS, okV1, requireV1Auth } from "@/lib/v1/api";

export async function POST(req: NextRequest) {
  const auth = await requireV1Auth(req, { role: "driver" });
  if ("error" in auth) return auth.error;

  const driver = await prisma.driver.findUnique({ where: { id: auth.session.userId } });
  if (!driver) return ERRORS.notFound("الحساب");
  if (driver.status !== "approved") {
    return ERRORS.validation("حسابك غير معتمد بعد — لا يمكن بدء وردية");
  }

  // إنهاء أي وردية مفتوحة عالقة
  const open = await prisma.driverShift.findFirst({
    where: { driverId: driver.id, status: "active" },
  });
  if (open) {
    await prisma.driverShift.update({
      where: { id: open.id },
      data: { status: "ended", endedAt: new Date() },
    });
  }

  let body: { lat?: number; lng?: number; city?: string } = {};
  try {
    body = await req.json();
  } catch {
    // اختياري
  }

  const shift = await prisma.driverShift.create({
    data: {
      driverId: driver.id,
      city: body.city || driver.city,
    },
  });

  await prisma.driver.update({
    where: { id: driver.id },
    data: {
      available: true,
      lat: Number.isFinite(Number(body.lat)) ? Number(body.lat) : driver.lat,
      lng: Number.isFinite(Number(body.lng)) ? Number(body.lng) : driver.lng,
    },
  });

  return okV1({
    shiftId: String(shift.id),
    startedAt: shift.startedAt,
    available: true,
  });
}
