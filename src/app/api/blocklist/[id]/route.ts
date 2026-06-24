import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

/** DELETE /api/blocklist/[id] — رفع الحظر (deactivate لا حذف) */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("blocklist");
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  const entry = await prisma.blockedEntity.findUnique({ where: { id } });
  if (!entry) return fail("القيد غير موجود", 404);

  const updated = await prisma.blockedEntity.update({ where: { id }, data: { active: false } });
  await logAudit(auth.session, "remove_blocklist", "blocklist", id, { kind: entry.kind, value: entry.value });
  return ok(updated);
}
