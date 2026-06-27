import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ERRORS, okV1, requireV1Auth } from "@/lib/v1/api";

export async function GET(req: NextRequest) {
  const auth = await requireV1Auth(req, { role: "driver" });
  if ("error" in auth) return auth.error;

  const driver = await prisma.driver.findUnique({
    where: { id: auth.session.userId },
    include: { documents: true },
  });
  if (!driver) return ERRORS.notFound("الحساب");

  const docs = driver.documents.map((d) => ({
    type: d.type, // license | registration | insurance | id_card
    status: d.status, // pending | approved | rejected
    number: d.number,
    expiryDate: d.expiryDate,
    note: d.note,
  }));

  return okV1({
    kycStatus: driver.status,
    documents: docs,
    canDrive: driver.status === "approved",
  });
}
