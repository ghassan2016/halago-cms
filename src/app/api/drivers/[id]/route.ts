import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("drivers");
  if ("error" in auth) return auth.error;

  const driver = await prisma.driver.findUnique({
    where: { id: Number(params.id) },
    include: {
      trips: { take: 10, orderBy: { createdAt: "desc" } },
      withdrawals: { take: 5, orderBy: { createdAt: "desc" } },
      documents: { orderBy: { type: "asc" } },
    },
  });
  if (!driver) return fail("السائق غير موجود", 404);

  const completedTrips = await prisma.trip.count({
    where: { driverId: driver.id, status: "completed" },
  });

  return ok({ ...driver, completed_trips: completedTrips });
}

// تحديث: الموافقة / التعطيل / تغيير الحالة
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("drivers");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.status === "string") data.status = body.status;
  if (typeof body.available === "boolean") data.available = body.available;

  if (Object.keys(data).length === 0) return fail("لا توجد بيانات للتحديث", 422);

  const driver = await prisma.driver.update({
    where: { id: Number(params.id) },
    data,
  });

  // تسجيل تدقيق للموافقة/التعليق/الرفض
  if (typeof body.status === "string") {
    const actionMap: Record<string, string> = {
      approved: "approve_driver",
      suspended: "suspend_driver",
      rejected: "reject_driver",
    };
    const action = actionMap[body.status];
    if (action) {
      await logAudit(auth.session, action, "driver", driver.id, { name: driver.name });
    }
  }

  return ok(driver);
}
