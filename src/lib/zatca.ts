// ZATCA-compliant simplified QR (Phase 1).
// يولّد TLV-encoded base64 يحوي: seller_name / VAT / timestamp / total / VAT amount.
// يطابق مواصفات هيئة الزكاة والضريبة السعودية للفواتير المبسّطة.

import QRCode from "qrcode";

interface ZatcaPayload {
  sellerName: string;
  vatNumber: string;
  timestamp: Date | string; // ISO 8601
  total: number; // الإجمالي شامل الضريبة
  vatAmount: number; // قيمة الضريبة فقط
}

/** يبني TLV (Type-Length-Value) لكل حقل */
function tlv(tag: number, value: string): Buffer {
  const valueBuf = Buffer.from(value, "utf-8");
  if (valueBuf.length > 255) throw new Error(`tag ${tag} value too long`);
  return Buffer.concat([Buffer.from([tag, valueBuf.length]), valueBuf]);
}

/** TLV string بصيغة base64 — يُستخدم في QR */
export function zatcaTlvBase64(p: ZatcaPayload): string {
  const ts = (p.timestamp instanceof Date ? p.timestamp : new Date(p.timestamp)).toISOString();
  const buffers = [
    tlv(1, p.sellerName),
    tlv(2, p.vatNumber),
    tlv(3, ts),
    tlv(4, p.total.toFixed(2)),
    tlv(5, p.vatAmount.toFixed(2)),
  ];
  return Buffer.concat(buffers).toString("base64");
}

/** يولّد PNG (Data URL base64) جاهز للعرض في <img src=...> */
export async function zatcaQrDataUrl(p: ZatcaPayload, size = 160): Promise<string> {
  const payload = zatcaTlvBase64(p);
  return QRCode.toDataURL(payload, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}
