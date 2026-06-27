import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule, ok, fail, parseListParams, buildMeta } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { computeTier } from "@/lib/tier";

export async function GET(req: NextRequest) {
  const auth = await requireModule("drivers");
  if ("error" in auth) return auth.error;

  const { page, perPage, search, status, skip } = parseListParams(req.url);
  const url = new URL(req.url);
  const sort = url.searchParams.get("sort") || ""; // rating | rating_asc | trips
  const tier = url.searchParams.get("tier") || "";
  const lowRated = url.searchParams.get("lowRated") === "true"; // متابعة أصحاب التقييم المنخفض

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (tier) where.tier = tier;
  if (lowRated) where.rating = { lt: 3.5 };

  let orderBy: any = { createdAt: "desc" };
  if (sort === "rating") orderBy = { rating: "desc" };
  else if (sort === "rating_asc") orderBy = { rating: "asc" };
  else if (sort === "trips") orderBy = { totalTrips: "desc" };

  const [total, drivers] = await Promise.all([
    prisma.driver.count({ where }),
    prisma.driver.findMany({ where, skip, take: perPage, orderBy }),
  ]);

  return ok(drivers, buildMeta(total, page, perPage));
}

// POST /api/drivers — إضافة سائق يدوياً من الداشبورد
export async function POST(req: NextRequest) {
  const auth = await requireModule("drivers");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  const phone = String(body?.phone || "").trim();
  const email = String(body?.email || "").trim() || null;
  const vehicleType = String(body?.vehicleType || "car").trim();
  const carMake = String(body?.carMake || "").trim() || null;
  const carModel = String(body?.carModel || "").trim() || null;
  const plateNumber = String(body?.plateNumber || "").trim() || null;
  const city = String(body?.city || "").trim() || null;
  const status = ["pending", "approved"].includes(body?.status) ? body.status : "approved";

  if (!name) return fail("الاسم مطلوب", 422);
  if (!phone) return fail("رقم الهاتف مطلوب", 422);

  const dupe = await prisma.driver.findFirst({
    where: { OR: [{ phone }, ...(email ? [{ email }] : [])] },
  });
  if (dupe) return fail("يوجد سائق بنفس الهاتف أو البريد", 409);

  // التأكد أن الرقم/الإيميل ليسا في قائمة الحظر النهائي
  const blocked = await prisma.blockedEntity.findFirst({
    where: { active: true, OR: [{ kind: "phone", value: phone }, ...(email ? [{ kind: "email", value: email }] : [])] },
  });
  if (blocked) return fail("هذا الرقم أو البريد محظور ولا يمكن تسجيله", 409);

  const driver = await prisma.driver.create({
    data: { name, phone, email, vehicleType, carMake, carModel, plateNumber, city, status, tier: computeTier(5, 0) },
  });
  await logAudit(auth.session, "create_driver", "driver", driver.id, { name, phone });
  return ok(driver);
}
