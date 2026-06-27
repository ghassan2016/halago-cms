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

  // وثائق قاربت على الانتهاء (خلال 30 يوماً) — للتنبيه (نقطة 12)
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  const expiringDocs = driver.documents.filter(
    (d) => d.expiryDate && d.expiryDate <= soon
  );

  return ok({ ...driver, completed_trips: completedTrips, expiringDocs });
}

// تحديث: الموافقة / التعطيل / الحظر النهائي / تغيير الحالة
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("drivers");
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.status === "string") data.status = body.status; // pending|approved|suspended|rejected|banned
  if (typeof body.available === "boolean") data.available = body.available;
  if (typeof body.banReason === "string") data.banReason = body.banReason;

  if (Object.keys(data).length === 0) return fail("لا توجد بيانات للتحديث", 422);

  const existing = await prisma.driver.findUnique({ where: { id } });
  if (!existing) return fail("السائق غير موجود", 404);

  // عند الحظر النهائي: يُعطّل ويُضاف رقمه وإيميله لقائمة الحظر حتى لا يعيد التسجيل (نقطة 9)
  if (body.status === "banned") {
    data.available = false;
    const reason = body.banReason || "حظر نهائي للسائق";
    const entries: { kind: string; value: string }[] = [];
    if (existing.phone) entries.push({ kind: "phone", value: existing.phone });
    if (existing.email) entries.push({ kind: "email", value: existing.email });
    for (const e of entries) {
      await prisma.blockedEntity.upsert({
        where: { kind_value: { kind: e.kind, value: e.value } },
        update: { active: true, reason, blockedById: auth.session?.sub ? Number(auth.session.sub) : null, blockedByName: auth.session?.name ?? null },
        create: {
          kind: e.kind,
          value: e.value,
          reason,
          active: true,
          blockedById: auth.session?.sub ? Number(auth.session.sub) : null,
          blockedByName: auth.session?.name ?? null,
        },
      });
    }
  }

  const driver = await prisma.driver.update({ where: { id }, data });

  // تسجيل تدقيق
  if (typeof body.status === "string") {
    const actionMap: Record<string, string> = {
      approved: "approve_driver",
      suspended: "suspend_driver",
      rejected: "reject_driver",
      banned: "ban_driver",
    };
    const action = actionMap[body.status];
    if (action) {
      await logAudit(auth.session, action, "driver", driver.id, { name: driver.name, banReason: body.banReason });
    }
  }

  return ok(driver);
}
