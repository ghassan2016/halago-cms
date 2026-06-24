import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ok, parseListParams, buildMeta } from "@/lib/api-helpers";

// سجل التدقيق — للمدير العام فقط
export async function GET(req: NextRequest) {
  const auth = await requireRole(["super_admin"]);
  if ("error" in auth) return auth.error;

  const { page, perPage, search, skip } = parseListParams(req.url);
  const { searchParams } = new URL(req.url);
  const entity = (searchParams.get("entity") || "").trim();

  const where: any = {};
  if (search) {
    where.OR = [
      { actorName: { contains: search, mode: "insensitive" } },
      { action: { contains: search, mode: "insensitive" } },
    ];
  }
  if (entity) where.entity = entity;

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, skip, take: perPage, orderBy: { createdAt: "desc" } }),
  ]);

  return ok(logs, buildMeta(total, page, perPage));
}
