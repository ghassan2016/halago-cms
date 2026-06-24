import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";

export async function GET() {
  const auth = await requireModule("pricing");
  if ("error" in auth) return auth.error;

  const rules = await prisma.surgeRule.findMany({ orderBy: { startHour: "asc" } });
  return ok(rules);
}

export async function POST(req: NextRequest) {
  const auth = await requireModule("pricing");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  const startHour = Number(body?.startHour);
  const endHour = Number(body?.endHour);
  const multiplier = Number(body?.multiplier);

  if (!name) return fail("اسم القاعدة مطلوب", 422);
  if (!(startHour >= 0 && startHour <= 23) || !(endHour >= 1 && endHour <= 24))
    return fail("ساعات غير صالحة (0-24)", 422);
  if (endHour <= startHour) return fail("ساعة النهاية يجب أن تكون بعد البداية", 422);
  if (!(multiplier >= 1)) return fail("المضاعف يجب ألا يقل عن 1", 422);

  const days = Array.isArray(body?.days) ? body.days.join(",") : String(body?.days || "0,1,2,3,4,5,6");

  const rule = await prisma.surgeRule.create({
    data: { name, days, startHour, endHour, multiplier, active: true },
  });
  return ok(rule);
}
