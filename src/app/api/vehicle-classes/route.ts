import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";

export async function GET() {
  const auth = await requireModule("pricing");
  if ("error" in auth) return auth.error;

  const classes = await prisma.vehicleClass.findMany({ orderBy: { sortOrder: "asc" } });
  return ok(classes);
}

export async function POST(req: NextRequest) {
  const auth = await requireModule("pricing");
  if ("error" in auth) return auth.error;

  const b = await req.json().catch(() => ({}));
  const key = String(b?.key || "").trim().toLowerCase();
  const name = String(b?.name || "").trim();
  if (!key || !name) return fail("المفتاح والاسم مطلوبان", 422);

  const exists = await prisma.vehicleClass.findUnique({ where: { key } });
  if (exists) return fail("المفتاح مستخدم مسبقاً", 409);

  const cls = await prisma.vehicleClass.create({
    data: {
      key,
      name,
      multiplier: Number(b?.multiplier ?? 1),
      capacity: Number(b?.capacity ?? 4),
      sortOrder: Number(b?.sortOrder ?? 0),
      active: b?.active !== false,
    },
  });
  return ok(cls);
}
