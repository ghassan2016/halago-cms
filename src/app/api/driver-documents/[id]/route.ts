import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

// اعتماد / رفض مستند سائق
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("drivers");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const status = String(body?.status || "");
  if (!["approved", "rejected", "pending"].includes(status)) {
    return fail("الحالة يجب أن تكون approved أو rejected", 422);
  }

  const doc = await prisma.driverDocument.findUnique({ where: { id: Number(params.id) } });
  if (!doc) return fail("المستند غير موجود", 404);

  const updated = await prisma.driverDocument.update({
    where: { id: doc.id },
    data: {
      status,
      note: typeof body.note === "string" ? body.note : doc.note,
      reviewedAt: new Date(),
    },
  });

  await logAudit(
    auth.session,
    status === "approved" ? "approve_document" : "reject_document",
    "document",
    updated.id,
    { driverId: doc.driverId, type: doc.type }
  );

  return ok(updated);
}
