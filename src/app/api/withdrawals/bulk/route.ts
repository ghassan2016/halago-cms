import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

/** POST /api/withdrawals/bulk — اعتماد/رفض دفعي لطلبات السحب */
export async function POST(req: NextRequest) {
  const auth = await requireModule("withdrawals");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const ids: number[] = Array.isArray(body?.ids) ? body.ids.map((x: any) => Number(x)).filter(Number.isFinite) : [];
  const action = String(body?.action || "");

  if (!ids.length) return fail("لم تُحدَّد أي طلبات", 422);
  if (ids.length > 200) return fail("لا يمكن تجاوز 200 طلب في عملية واحدة", 422);
  if (!["approve", "reject"].includes(action)) return fail("إجراء غير مدعوم", 422);

  // نطبّق فقط على المعلّقة لتجنّب تعديل حالة مكتملة سابقاً
  const status = action === "approve" ? "approved" : "rejected";
  const result = await prisma.withdrawalRequest.updateMany({
    where: { id: { in: ids }, status: "pending" },
    data: { status },
  });

  await logAudit(auth.session, "bulk_withdrawals", "withdrawal", null, {
    action,
    requested: ids.length,
    updated: result.count,
    ids: ids.slice(0, 50),
  });

  return ok({ updated: result.count, failed: ids.length - result.count });
}
