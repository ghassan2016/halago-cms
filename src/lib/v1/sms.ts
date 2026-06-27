// مزوّد SMS — في dev يطبع الرمز في الـ console ويُرجعه في رد الـ API.
// في الإنتاج نتكامل مع Unifonic / Twilio عبر متغيّر MOBILE_SMS_PROVIDER.

interface SmsPayload {
  phone: string; // E.164
  message: string;
}

interface SmsResult {
  sent: boolean;
  provider: string;
  messageId?: string;
}

export async function sendSms(payload: SmsPayload): Promise<SmsResult> {
  const provider = process.env.MOBILE_SMS_PROVIDER || "console";

  if (provider === "console") {
    // dev: نطبع فقط
    console.log(`[SMS:console] → ${payload.phone}: ${payload.message}`);
    return { sent: true, provider, messageId: `dev-${Date.now()}` };
  }

  if (provider === "unifonic") {
    const appSid = process.env.UNIFONIC_APP_SID;
    const senderId = process.env.UNIFONIC_SENDER_ID || "HalaGo";
    if (!appSid) {
      console.warn("[SMS:unifonic] UNIFONIC_APP_SID مفقود — fallback لـ console");
      return sendSms({ ...payload, phone: payload.phone });
    }
    try {
      const res = await fetch("https://api.unifonic.com/rest/SMS/messages", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          AppSid: appSid,
          Recipient: payload.phone,
          Body: payload.message,
          SenderID: senderId,
          baseEncode: "true",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { messageID?: string };
      return { sent: res.ok, provider, messageId: json.messageID };
    } catch (e) {
      console.error("[SMS:unifonic] فشل الإرسال", e);
      return { sent: false, provider };
    }
  }

  console.warn(`[SMS] provider غير مدعوم: ${provider}`);
  return { sent: false, provider };
}

/** هل dev mode؟ يستخدمه /send-otp لإرجاع الرمز في الرد */
export function isDevSmsMode(): boolean {
  return (process.env.MOBILE_SMS_PROVIDER || "console") === "console";
}
