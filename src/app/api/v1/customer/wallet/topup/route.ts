import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ERRORS, okV1, requireV1Auth } from "@/lib/v1/api";
import { createMoyasarPayment, isDevPayments } from "@/lib/v1/moyasar";

/**
 * POST /api/v1/customer/wallet/topup
 * body: { amount: number, paymentMethod?: "card"|"applepay"|"stcpay" }
 * يرجع: { reference, redirectUrl, devMode }
 */
export async function POST(req: NextRequest) {
  const auth = await requireV1Auth(req, { role: "customer" });
  if ("error" in auth) return auth.error;

  let body: { amount?: number };
  try {
    body = await req.json();
  } catch {
    return ERRORS.validation("body غير صالح");
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 10 || amount > 5000) {
    return ERRORS.validation("المبلغ يجب أن يكون بين 10 و 5000 ر.س");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: auth.session.userId },
  });
  if (!customer) return ERRORS.notFound("الحساب");

  const reference = `HG-PAY-${Date.now()}-${customer.id}`;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const result = await createMoyasarPayment({
      amountHalalas: Math.round(amount * 100),
      description: `شحن محفظة HalaGo — ${customer.phone}`,
      reference,
      callbackUrl: `${baseUrl}/api/v1/payments/moyasar/webhook`,
      metadata: { customerId: String(customer.id), reference },
    });

    await prisma.paymentIntent.create({
      data: {
        reference,
        providerId: result.providerId,
        ownerType: "customer",
        ownerId: customer.id,
        amount,
        purpose: "wallet_topup",
        provider: result.provider,
        redirectUrl: result.redirectUrl,
      },
    });

    return okV1({
      reference,
      redirectUrl: result.redirectUrl,
      devMode: isDevPayments(),
    });
  } catch (err) {
    return ERRORS.serverError(err);
  }
}
