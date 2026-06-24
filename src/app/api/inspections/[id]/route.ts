import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

/** GET /api/inspections/[id] — تفاصيل الفحص (مع السائق) */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("vehicles");
  if ("error" in auth) return auth.error;

  const inspection = await prisma.vehicleInspection.findUnique({
    where: { id: Number(params.id) },
    include: {
      driver: { select: { id: true, name: true, phone: true, carMake: true, carModel: true, plateNumber: true } },
    },
  });
  if (!inspection) return fail("الفحص غير موجود", 404);
  return ok(inspection);
}

/** PATCH /api/inspections/[id] — اعتماد/تعليم/رفض */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("vehicles");
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");

  const inspection = await prisma.vehicleInspection.findUnique({ where: { id } });
  if (!inspection) return fail("الفحص غير موجود", 404);

  const newStatus = action === "approve" ? "approved" : action === "flag" ? "flagged" : action === "reject" ? "rejected" : null;
  if (!newStatus) return fail("لا توجد عملية صالحة", 422);

  const updated = await prisma.vehicleInspection.update({
    where: { id },
    data: {
      status: newStatus,
      reviewerId: auth.session?.sub ? Number(auth.session.sub) : null,
      reviewerName: auth.session?.name ?? null,
      reviewedAt: new Date(),
    },
  });

  if (action === "approve") {
    await logAudit(auth.session, "approve_inspection", "inspection", id, { driverId: inspection.driverId });
  } else if (action === "flag") {
    await logAudit(auth.session, "flag_inspection", "inspection", id, { driverId: inspection.driverId, damage: inspection.damageScore });
  }

  return ok(updated);
}
