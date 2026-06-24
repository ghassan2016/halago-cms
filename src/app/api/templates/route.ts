import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

/** يستخرج المتغيّرات {{var}} من نصّ */
function extractVars(text: string): string[] {
  const out: string[] = [];
  const re = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;
  let m;
  while ((m = re.exec(text))) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

/** GET /api/templates */
export async function GET() {
  const auth = await requireModule("templates");
  if ("error" in auth) return auth.error;
  const templates = await prisma.notificationTemplate.findMany({ orderBy: { createdAt: "desc" } });
  return ok(templates);
}

/** POST /api/templates — إضافة قالب جديد */
export async function POST(req: NextRequest) {
  const auth = await requireModule("templates");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const key = String(body?.key || "").trim();
  const name = String(body?.name || "").trim();
  const title = String(body?.title || "").trim();
  const tBody = String(body?.body || "").trim();
  const audience = String(body?.audience || "all");

  if (!key || !/^[a-z0-9_]+$/.test(key)) return fail("المفتاح غير صالح", 422);
  if (!name || !title || !tBody) return fail("الحقول مطلوبة", 422);
  if (!["all", "drivers", "customers"].includes(audience)) return fail("جمهور غير صالح", 422);

  const exists = await prisma.notificationTemplate.findUnique({ where: { key } });
  if (exists) return fail("هذا المفتاح مستخدم مسبقاً", 409);

  const variables = Array.from(new Set([...extractVars(title), ...extractVars(tBody)]));
  const template = await prisma.notificationTemplate.create({
    data: { key, name, title, body: tBody, audience, variables: JSON.stringify(variables), active: true },
  });
  await logAudit(auth.session, "upsert_template", "template", template.id, { key, name });
  return ok(template);
}
