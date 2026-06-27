import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ERRORS, okV1, requireV1Auth } from "@/lib/v1/api";

/**
 * POST /api/v1/customer/trips/:id/rate
 * body: { stars: 1..5, tags?: string[], comment?: string, tip?: number }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireV1Auth(req, { role: "customer" });
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  if (!Number.isFinite(id)) return ERRORS.notFound("الرحلة");

  let body: { stars?: number; tags?: string[]; comment?: string; tip?: number };
  try {
    body = await req.json();
  } catch {
    return ERRORS.validation("body غير صالح");
  }

  const stars = Math.round(Number(body.stars ?? 0));
  if (stars < 1 || stars > 5) return ERRORS.validation("التقييم يجب أن يكون 1-5");

  const tip = Number(body.tip ?? 0);
  if (tip < 0 || tip > 500) return ERRORS.validation("قيمة الإكرامية غير صالحة");

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { driver: true, customer: true },
  });
  if (!trip) return ERRORS.notFound("الرحلة");
  if (trip.customerId !== auth.session.userId) return ERRORS.forbidden();
  if (trip.status !== "completed") {
    return ERRORS.validation("يمكن التقييم فقط بعد اكتمال الرحلة");
  }
  if (trip.rating != null) {
    return ERRORS.validation("تمّ تقييم هذه الرحلة مسبقاً");
  }

  const tags = Array.isArray(body.tags) ? body.tags.slice(0, 5).join(",") : "";
  const comment = (body.comment || "").trim().slice(0, 280);

  await prisma.$transaction(async (tx) => {
    await tx.trip.update({
      where: { id },
      data: { rating: stars },
    });
    await tx.review.create({
      data: {
        tripId: id,
        tripNo: trip.number,
        fromType: "customer",
        fromId: trip.customerId,
        fromName: trip.customer?.name,
        toType: "driver",
        toId: trip.driverId,
        toName: trip.driver?.name,
        stars,
        comment: [tags, comment].filter(Boolean).join(" — ") || null,
      },
    });

    // متوسّط تقييم السائق (rolling average بسيط)
    if (trip.driverId && trip.driver) {
      const totalReviews = await tx.review.count({
        where: { toType: "driver", toId: trip.driverId },
      });
      const sumAgg = await tx.review.aggregate({
        where: { toType: "driver", toId: trip.driverId },
        _avg: { stars: true },
      });
      await tx.driver.update({
        where: { id: trip.driverId },
        data: {
          rating: Math.round((sumAgg._avg.stars ?? 5) * 100) / 100,
        },
      });
      // الإكرامية تذهب للسائق مباشرة
      if (tip > 0) {
        await tx.driver.update({
          where: { id: trip.driverId },
          data: { walletBalance: { increment: tip } },
        });
        await tx.transaction.create({
          data: {
            type: "ride_payment",
            amount: tip,
            actorType: "driver",
            actorId: trip.driverId,
            refId: id,
          },
        });
      }
      // ignore totalReviews — مستقبلاً نضيف عمود في Driver
      void totalReviews;
    }
  });

  return okV1({ rated: true, stars, tipApplied: tip });
}
