import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

function extractVars(text: string): string[] {
  const out: string[] = [];
  const re = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;
  let m;
  while ((m = re.exec(text))) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

/** PATCH /api/templates/[id] */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("templates");
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (typeof body.body === "string" && body.body.trim()) data.body = body.body.trim();
  if (typeof body.audience === "string" && ["all", "drivers", "customers"].includes(body.audience)) data.audience = body.audience;
  if (typeof body.active === "boolean") data.active = body.active;
  if (data.title || data.body) {
    const cur = await prisma.notificationTemplate.findUnique({ where: { id } });
    const variables = Array.from(new Set([
      ...extractVars(data.title ?? cur?.title ?? ""),
      ...extractVars(data.body ?? cur?.body ?? ""),
    ]));
    data.variables = JSON.stringify(variables);
  }
  if (Object.keys(data).length === 0) return fail("لا تغييرات", 422);

  const updated = await prisma.notificationTemplate.update({ where: { id }, data });
  await logAudit(auth.session, "upsert_template", "template", id, { key: updated.key });
  return ok(updated);
}

/** DELETE /api/templates/[id] */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("templates");
  if ("error" in auth) return auth.error;
  const id = Number(params.id);
  await prisma.notificationTemplate.delete({ where: { id } });
  return ok({ id });
}
