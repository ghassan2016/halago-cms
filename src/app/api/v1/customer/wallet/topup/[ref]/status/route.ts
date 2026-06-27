import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ERRORS, okV1, requireV1Auth } from "@/lib/v1/api";

export async function GET(
  req: NextRequest,
  { params }: { params: { ref: string } },
) {
  const auth = await requireV1Auth(req, { role: "customer" });
  if ("error" in auth) return auth.error;

  const intent = await prisma.paymentIntent.findUnique({
    where: { reference: params.ref },
  });
  if (!intent) return ERRORS.notFound("العملية");
  if (intent.ownerType !== "customer" || intent.ownerId !== auth.session.userId) {
    return ERRORS.forbidden();
  }

  const customer = await prisma.customer.findUnique({
    where: { id: auth.session.userId },
  });

  return okV1({
    reference: intent.reference,
    status: intent.status,
    amount: intent.amount,
    walletBalance: customer?.walletBalance ?? 0,
  });
}
