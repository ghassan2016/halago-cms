import { clearSessionCookie } from "@/lib/auth";
import { ok } from "@/lib/api-helpers";

export async function POST() {
  clearSessionCookie();
  return ok({ message: "تم تسجيل الخروج" });
}
