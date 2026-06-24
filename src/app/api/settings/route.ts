import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok } from "@/lib/api-helpers";

export async function GET() {
  const auth = await requireModule("settings");
  if ("error" in auth) return auth.error;

  const rows = await prisma.setting.findMany();
  const settings = rows.reduce<Record<string, string>>((acc, r) => {
    acc[r.key] = r.value;
    return acc;
  }, {});
  return ok(settings);
}

// حفظ مجموعة إعدادات
export async function PUT(req: NextRequest) {
  const auth = await requireModule("settings");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const entries = Object.entries(body || {}).filter(([, v]) => v !== undefined);

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    )
  );

  return ok({ saved: entries.length });
}
