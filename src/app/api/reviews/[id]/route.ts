import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

// إخفاء / إظهار مراجعة (محتوى مخالف)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("reviews");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  if (typeof body.hidden !== "boolean") return fail("القيمة hidden مطلوبة (boolean)", 422);

  const review = await prisma.review.findUnique({ where: { id: Number(params.id) } });
  if (!review) return fail("المراجعة غير موجودة", 404);

  const updated = await prisma.review.update({
    where: { id: review.id },
    data: { hidden: body.hidden },
  });

  await logAudit(auth.session, body.hidden ? "hide_review" : "unhide_review", "review", updated.id, {
    stars: review.stars,
    toName: review.toName,
  });

  return ok(updated);
}
