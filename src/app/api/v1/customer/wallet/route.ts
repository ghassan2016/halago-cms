import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ERRORS, okV1, requireV1Auth } from "@/lib/v1/api";

export async function GET(req: NextRequest) {
  const auth = await requireV1Auth(req, { role: "customer" });
  if ("error" in auth) return auth.error;

  const customer = await prisma.customer.findUnique({
    where: { id: auth.session.userId },
  });
  if (!customer) return ERRORS.notFound("الحساب");

  const transactions = await prisma.transaction.findMany({
    where: { actorType: "customer", actorId: customer.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return okV1({
    balance: customer.walletBalance,
    currency: "SAR",
    transactions: transactions.map((t) => ({
      id: String(t.id),
      type: t.type,
      amount: t.amount,
      status: t.status,
      createdAt: t.createdAt,
    })),
  });
}
