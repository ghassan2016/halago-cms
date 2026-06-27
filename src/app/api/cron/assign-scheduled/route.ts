import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tierRank } from "@/lib/tier";

/**
 * GET /api/cron/assign-scheduled
 * مهمة مجدولة (Vercel Cron): تُعيّن سائقاً تلقائياً للرحلات المجدولة التي يبدأ موعدها خلال 6 ساعات
 * ولم يُسند لها سائق بعد. تُفضّل السائقين أصحاب التصنيف الأعلى ثم التقييم الأعلى (نقطة 11).
 *
 * الحماية: ترويسة Authorization: Bearer <CRON_SECRET> (إن ضُبط المتغيّر).
 */
export const dynamic = "force-dynamic"; // لا يُبنى مسبقاً — ينفّذ وقت الطلب فقط
const ASSIGN_WINDOW_HOURS = 6;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // بيئة تطوير
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${secret}` || req.nextUrl.searchParams.get("secret") === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + ASSIGN_WINDOW_HOURS * 60 * 60 * 1000);

  // رحلات مجدولة قريبة بدون سائق
  const trips = await prisma.trip.findMany({
    where: {
      driverId: null,
      status: { in: ["pending", "accepted"] },
      scheduledAt: { gte: now, lte: horizon },
    },
    orderBy: { scheduledAt: "asc" },
    take: 100,
  });

  const assigned: { tripId: number; driverId: number; driverName: string }[] = [];
  const unassigned: number[] = [];

  for (const trip of trips) {
    // مرشحون: سائقون معتمدون (يُفضّل بنفس المدينة)
    const candidates = await prisma.driver.findMany({
      where: {
        status: "approved",
        ...(trip.city ? { city: trip.city } : {}),
      },
      take: 200,
    });

    // ترتيب حسب التصنيف ثم التقييم
    candidates.sort((a, b) => {
      const r = tierRank(b.tier) - tierRank(a.tier);
      return r !== 0 ? r : b.rating - a.rating;
    });

    let picked: (typeof candidates)[number] | null = null;
    for (const c of candidates) {
      // تجنّب التعارض: سائق لديه رحلة مجدولة أخرى ضمن ساعة من نفس الموعد
      if (trip.scheduledAt) {
        const winStart = new Date(trip.scheduledAt.getTime() - 60 * 60 * 1000);
        const winEnd = new Date(trip.scheduledAt.getTime() + 60 * 60 * 1000);
        const conflict = await prisma.trip.findFirst({
          where: {
            driverId: c.id,
            status: { in: ["pending", "accepted", "arrived", "in_progress"] },
            scheduledAt: { gte: winStart, lte: winEnd },
          },
        });
        if (conflict) continue;
      }
      picked = c;
      break;
    }

    if (!picked) {
      unassigned.push(trip.id);
      continue;
    }

    await prisma.trip.update({
      where: { id: trip.id },
      data: { driverId: picked.id, autoAssignedAt: now },
    });
    assigned.push({ tripId: trip.id, driverId: picked.id, driverName: picked.name });
  }

  return NextResponse.json({
    ok: true,
    checked: trips.length,
    assigned,
    unassignedCount: unassigned.length,
    unassigned,
  });
}
