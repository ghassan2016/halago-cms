import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Webhook من Moyasar — يُستدعى عند نجاح/فشل دفع.
 * (في dev mode نستخدم /dev-checkout بدلاً من هذا)
 *
 * يجب التحقّق من توقيع Moyasar في الإنتاج عبر MOYASAR_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      type?: string;
      data?: {
        id?: string;
        status?: string; // paid | failed
        amount?: number;
        metadata?: { reference?: string; customerId?: string };
      };
    };

    const ref = body.data?.metadata?.reference;
    if (!ref) return Response.json({ received: true });

    const intent = await prisma.paymentIntent.findUnique({
      where: { reference: ref },
    });
    if (!intent || intent.status !== "pending") {
      return Response.json({ received: true });
    }

    const status = body.data?.status;
    if (status === "paid") {
      await prisma.$transaction(async (tx) => {
        await tx.paymentIntent.update({
          where: { reference: ref },
          data: { status: "succeeded", providerId: body.data?.id ?? intent.providerId },
        });
        if (intent.purpose === "wallet_topup") {
          await tx.customer.update({
            where: { id: intent.ownerId },
            data: { walletBalance: { increment: intent.amount } },
          });
          await tx.transaction.create({
            data: {
              type: "topup",
              amount: intent.amount,
              actorType: "customer",
              actorId: intent.ownerId,
              status: "success",
            },
          });
        }
      });
    } else if (status === "failed") {
      await prisma.paymentIntent.update({
        where: { reference: ref },
        data: { status: "failed" },
      });
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error("[moyasar webhook]", err);
    return Response.json({ received: false }, { status: 200 });
  }
}
