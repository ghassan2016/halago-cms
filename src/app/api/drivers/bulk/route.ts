import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

/** POST /api/drivers/bulk — تنفيذ إجراء على مجموعة سائقين */
export async function POST(req: NextRequest) {
  const auth = await requireModule("drivers");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const ids: number[] = Array.isArray(body?.ids) ? body.ids.map((x: any) => Number(x)).filter(Number.isFinite) : [];
  const action = String(body?.action || "");

  if (!ids.length) return fail("لم تُحدَّد أي عناصر", 422);
  if (ids.length > 200) return fail("لا يمكن تجاوز 200 عنصر في عملية واحدة", 422);
  if (!["approve", "suspend"].includes(action)) return fail("إجراء غير مدعوم", 422);

  const status = action === "approve" ? "approved" : "suspended";
  const result = await prisma.driver.updateMany({
    where: { id: { in: ids } },
    data: { status },
  });

  await logAudit(auth.session, "bulk_drivers", "driver", null, {
    action,
    requested: ids.length,
    updated: result.count,
    ids: ids.slice(0, 50),
  });

  return ok({ updated: result.count, failed: ids.length - result.count });
}
