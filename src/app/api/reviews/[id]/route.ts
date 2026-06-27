import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { recomputeRating } from "@/lib/ratings";

// إخفاء / إظهار مراجعة (محتوى مخالف) — يعيد حساب تقييم الطرف المُقيَّم
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

  // إعادة حساب المتوسط من المراجعات الظاهرة فقط (إزالة أثر التقييم الظالم)
  const newRating = await recomputeRating(review.toType, review.toId);

  await logAudit(auth.session, body.hidden ? "hide_review" : "unhide_review", "review", updated.id, {
    stars: review.stars,
    toName: review.toName,
    newRating,
  });

  return ok({ ...updated, newRating });
}

// حذف مراجعة نهائياً (مثلاً تقييم نجمة ظالم والسائق غير مذنب) — يعيد حساب التقييم
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireModule("reviews");
  if ("error" in auth) return auth.error;

  const review = await prisma.review.findUnique({ where: { id: Number(params.id) } });
  if (!review) return fail("المراجعة غير موجودة", 404);

  await prisma.review.delete({ where: { id: review.id } });
  const newRating = await recomputeRating(review.toType, review.toId);

  await logAudit(auth.session, "delete_review", "review", review.id, {
    stars: review.stars,
    toName: review.toName,
    newRating,
  });

  return ok({ deleted: true, newRating });
}
