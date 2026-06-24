import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail, parseListParams, buildMeta } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

const KINDS = ["phone", "email", "id_number", "device_id"];

/** GET /api/blocklist — قائمة الحظر مع فلتر */
export async function GET(req: NextRequest) {
  const auth = await requireModule("blocklist");
  if ("error" in auth) return auth.error;

  const { page, perPage, search, skip } = parseListParams(req.url);
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "";
  const kind = url.searchParams.get("kind") || "";
  const now = new Date();

  const where: any = {};
  if (search) {
    where.OR = [{ value: { contains: search } }, { reason: { contains: search } }];
  }
  if (kind && KINDS.includes(kind)) where.kind = kind;
  if (status === "active") {
    where.active = true;
    where.OR = [...(where.OR || []), { expiresAt: null }, { expiresAt: { gt: now } }];
  } else if (status === "expired") {
    where.AND = [{ expiresAt: { not: null } }, { expiresAt: { lte: now } }];
  }

  const [total, entries, totalBlocked, activeBlocks, expiredCount] = await Promise.all([
    prisma.blockedEntity.count({ where }),
    prisma.blockedEntity.findMany({
      where,
      skip,
      take: perPage,
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    }),
    prisma.blockedEntity.count(),
    prisma.blockedEntity.count({
      where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    }),
    prisma.blockedEntity.count({ where: { expiresAt: { lte: now } } }),
  ]);

  return ok({ entries, totalBlocked, activeBlocks, expiredCount }, buildMeta(total, page, perPage));
}

/** POST /api/blocklist — إضافة قيد حظر */
export async function POST(req: NextRequest) {
  const auth = await requireModule("blocklist");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const kind = String(body?.kind || "");
  const value = String(body?.value || "").trim();
  const reason = String(body?.reason || "").trim() || null;
  const expiresAt = body?.expiresAt ? new Date(body.expiresAt) : null;

  if (!KINDS.includes(kind)) return fail("نوع غير صالح", 422);
  if (!value) return fail("القيمة مطلوبة", 422);

  // upsert: إن وُجد القيد سابقاً نُفعّله من جديد
  const existing = await prisma.blockedEntity.findUnique({ where: { kind_value: { kind, value } } });
  const entry = existing
    ? await prisma.blockedEntity.update({
        where: { id: existing.id },
        data: { active: true, reason, expiresAt, blockedById: auth.session?.sub ? Number(auth.session.sub) : null, blockedByName: auth.session?.name ?? null },
      })
    : await prisma.blockedEntity.create({
        data: {
          kind,
          value,
          reason,
          expiresAt,
          active: true,
          blockedById: auth.session?.sub ? Number(auth.session.sub) : null,
          blockedByName: auth.session?.name ?? null,
        },
      });

  await logAudit(auth.session, "create_blocklist", "blocklist", entry.id, { kind, value });
  return ok(entry);
}
