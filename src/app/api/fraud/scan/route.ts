import { NextRequest } from "next/server";
import { requireModule, ok } from "@/lib/api-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { runFraudScan } from "@/lib/fraud";

/** POST /api/fraud/scan — تشغيل المسح الدفعي يدوياً */
export async function POST(req: NextRequest) {
  // مسح الاحتيال ثقيل — حدّ 3 طلبات في الدقيقة
  const limited = checkRateLimit(req, { max: 3, windowMs: 60_000, key: "fraud-scan" });
  if (limited) return limited;

  const auth = await requireModule("fraud");
  if ("error" in auth) return auth.error;

  const result = await runFraudScan();
  await logAudit(auth.session, "scan_fraud", "fraud", null, result);
  return ok(result);
}
