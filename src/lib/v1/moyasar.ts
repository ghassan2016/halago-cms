// بوّابة Moyasar — في dev mode نُولّد رابطاً تجريبياً (يستدعي /dev-credit عند فتحه)
// في الإنتاج: ينشئ payment intent عبر Moyasar API.

const MOYASAR_API = "https://api.moyasar.com/v1/payments";

interface CreatePaymentParams {
  amountHalalas: number; // بالهللة (1 ر.س = 100 هللة)
  description: string;
  reference: string;
  callbackUrl: string; // رابط الـ webhook
  metadata?: Record<string, string>;
}

interface CreatePaymentResult {
  providerId: string | null;
  redirectUrl: string;
  provider: "moyasar" | "dev";
}

export async function createMoyasarPayment(
  params: CreatePaymentParams,
): Promise<CreatePaymentResult> {
  const secretKey = process.env.MOYASAR_SECRET_KEY;

  if (!secretKey) {
    // dev fallback — صفحة بسيطة تستدعي /dev-credit
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return {
      providerId: null,
      provider: "dev",
      redirectUrl: `${baseUrl}/api/v1/payments/dev-checkout?ref=${encodeURIComponent(params.reference)}`,
    };
  }

  try {
    const res = await fetch(MOYASAR_API, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(secretKey + ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: params.amountHalalas,
        currency: "SAR",
        description: params.description,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      }),
    });
    const json = (await res.json()) as { id?: string; source?: { transaction_url?: string } };
    return {
      providerId: json.id ?? null,
      provider: "moyasar",
      redirectUrl: json.source?.transaction_url ?? "",
    };
  } catch (err) {
    throw new Error(`Moyasar create failed: ${err}`);
  }
}

export function isDevPayments(): boolean {
  return !process.env.MOYASAR_SECRET_KEY;
}
