import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// مولّد عشوائي بسيط
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[rand(0, arr.length - 1)];
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000);

const firstNames = ["أحمد", "محمد", "خالد", "علي", "يوسف", "عمر", "سعيد", "فهد", "ناصر", "ماجد", "سلطان", "بدر", "طارق", "وليد", "حسن", "كريم", "إبراهيم", "عبدالله", "مازن", "رامي"];
const lastNames = ["العتيبي", "الشمري", "القحطاني", "الدوسري", "الحربي", "المطيري", "الغامدي", "الزهراني", "السبيعي", "البقمي", "العنزي", "الرشيدي"];
const femaleNames = ["نورة", "سارة", "ريم", "هند", "لمى", "جواهر", "العنود", "دانة", "شهد", "روان"];
const cities = ["الرياض", "جدة", "الدمام", "مكة", "المدينة", "الطائف", "تبوك", "أبها"];
// مراكز المدن (إحداثيات تقريبية) لتوليد مواقع السائقين
const cityCoords: Record<string, [number, number]> = {
  "الرياض": [24.7136, 46.6753],
  "جدة": [21.4858, 39.1925],
  "الدمام": [26.4207, 50.0888],
  "مكة": [21.3891, 39.8579],
  "المدينة": [24.5247, 39.5692],
  "الطائف": [21.2703, 40.4158],
  "تبوك": [28.3838, 36.555],
  "أبها": [18.2164, 42.5053],
};
const jitter = () => (Math.random() - 0.5) * 0.08; // ~±4 كم
const carMakes = [["تويوتا", "كامري"], ["هيونداي", "إلنترا"], ["نيسان", "ألتيما"], ["كيا", "سيراتو"], ["هوندا", "أكورد"], ["لكزس", "ES"]];
const vendorNames = ["مطعم البيك", "كافيه ميلانو", "بقالة الخير", "صيدلية النهدي", "مطعم الرومانسية", "حلويات سعد الدين", "سوبر ماركت العثيم", "مطعم كودو", "بيتزا هت", "ستاربكس", "دانكن", "ماك"];
const productNames = ["برجر كلاسيك", "بيتزا مارجريتا", "قهوة لاتيه", "شاورما عربي", "سلطة سيزر", "عصير برتقال", "كيك شوكولاتة", "سندويش دجاج", "بطاطس مقلية", "ماء معدني"];
const addresses = ["شارع الملك فهد", "حي النخيل", "طريق الملك عبدالله", "حي الياسمين", "شارع التحلية", "حي العليا", "طريق الأمير محمد", "حي الورود", "شارع العروبة", "حي الملقا"];

function fullName() {
  return `${pick([...firstNames, ...femaleNames])} ${pick(lastNames)}`;
}
function phone() {
  return `05${rand(0, 9)}${rand(1000000, 9999999)}`;
}

async function main() {
  console.log("🌱 تنظيف قاعدة البيانات...");
  await prisma.notificationTemplate.deleteMany();
  await prisma.cancellationReason.deleteMany();
  await prisma.blockedEntity.deleteMany();
  await prisma.vehicleInspection.deleteMany();
  await prisma.currency.deleteMany();
  await prisma.tripBreadcrumb.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.referralCode.deleteMany();
  await prisma.fraudFlag.deleteMany();
  await prisma.ticketMessage.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.sosAlert.deleteMany();
  await prisma.driverShift.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.review.deleteMany();
  await prisma.driverDocument.deleteMany();
  await prisma.vehicleClass.deleteMany();
  await prisma.extraFee.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.surgeRule.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.withdrawalRequest.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.product.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.promo.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.setting.deleteMany();

  // ===== الأدمن =====
  const passwordHash = await bcrypt.hash("password", 10);
  await prisma.admin.create({
    data: { name: "مدير النظام", email: "admin@halago.com", password: passwordHash, role: "super_admin" },
  });
  await prisma.admin.create({
    data: { name: "مشرف العمليات", email: "ops@halago.com", password: passwordHash, role: "operations" },
  });
  console.log("✅ أدمن: admin@halago.com / password");

  // ===== السائقون =====
  const driverIds: number[] = [];
  for (let i = 0; i < 30; i++) {
    const car = pick(carMakes);
    const status = pick(["approved", "approved", "approved", "pending", "suspended"]);
    const dCity = pick(cities);
    const [clat, clng] = cityCoords[dCity];
    const d = await prisma.driver.create({
      data: {
        name: fullName(),
        email: `driver${i + 1}@halago.com`,
        phone: phone(),
        status,
        available: status === "approved" ? Math.random() > 0.4 : false,
        lat: clat + jitter(),
        lng: clng + jitter(),
        vehicleType: pick(["car", "car", "car", "motorcycle"]),
        carMake: car[0],
        carModel: car[1],
        plateNumber: `${rand(1000, 9999)} ${pick(["أ ب ج", "د ر س", "ع ص ق"])}`,
        rating: Number((3.5 + Math.random() * 1.5).toFixed(1)),
        totalTrips: rand(0, 800),
        walletBalance: Number((Math.random() * 3000).toFixed(2)),
        city: dCity,
        createdAt: daysAgo(rand(1, 300)),
      },
    });
    driverIds.push(d.id);

    // مستندات التوثيق (KYC) — 4 لكل سائق
    const docTypes = ["license", "registration", "insurance", "id_card"] as const;
    for (const dt of docTypes) {
      const docStatus =
        status === "approved"
          ? Math.random() > 0.1
            ? "approved"
            : "pending"
          : status === "pending"
            ? "pending"
            : pick(["approved", "rejected", "pending"]);
      await prisma.driverDocument.create({
        data: {
          driverId: d.id,
          type: dt,
          number: `${dt.slice(0, 2).toUpperCase()}-${rand(100000, 999999)}`,
          status: docStatus,
          expiryDate: daysAgo(-rand(120, 900)),
          reviewedAt: docStatus === "pending" ? null : daysAgo(rand(1, 60)),
          note: docStatus === "rejected" ? "صورة غير واضحة، يرجى إعادة الرفع" : null,
        },
      });
    }
  }
  console.log(`✅ ${driverIds.length} سائق + مستندات التوثيق`);

  // ===== العملاء =====
  const customerIds: number[] = [];
  for (let i = 0; i < 60; i++) {
    const c = await prisma.customer.create({
      data: {
        name: fullName(),
        email: `user${i + 1}@halago.com`,
        phone: phone(),
        active: Math.random() > 0.1,
        walletBalance: Number((Math.random() * 500).toFixed(2)),
        rating: Number((4 + Math.random()).toFixed(1)),
        totalTrips: rand(0, 120),
        city: pick(cities),
        createdAt: daysAgo(rand(1, 300)),
      },
    });
    customerIds.push(c.id);
  }
  console.log(`✅ ${customerIds.length} عميل`);

  // ===== المتاجر والمنتجات =====
  const vendorIds: number[] = [];
  for (let i = 0; i < vendorNames.length; i++) {
    const v = await prisma.vendor.create({
      data: {
        name: vendorNames[i],
        category: pick(["restaurant", "restaurant", "grocery", "pharmacy", "store"]),
        status: pick(["open", "open", "open", "closed"]),
        commission: pick([10, 12, 15, 18, 20]),
        rating: Number((3.8 + Math.random() * 1.2).toFixed(1)),
        address: `${pick(addresses)}، ${pick(cities)}`,
        phone: phone(),
        createdAt: daysAgo(rand(10, 400)),
      },
    });
    vendorIds.push(v.id);
    for (let j = 0; j < rand(4, 9); j++) {
      await prisma.product.create({
        data: {
          vendorId: v.id,
          name: pick(productNames),
          price: Number((rand(8, 80) + 0.99).toFixed(2)),
          category: pick(["وجبات", "مشروبات", "حلويات", "وجبات خفيفة"]),
          available: Math.random() > 0.15,
        },
      });
    }
  }
  console.log(`✅ ${vendorIds.length} متجر + منتجاتها`);

  // ===== حساب تاجر لبوّابة التجّار =====
  await prisma.admin.create({
    data: {
      name: `صاحب ${vendorNames[0]}`,
      email: "vendor@halago.com",
      password: passwordHash,
      role: "vendor",
      vendorId: vendorIds[0],
    },
  });
  console.log("✅ حساب تاجر: vendor@halago.com / password");

  // ===== الرحلات + المعاملات =====
  let tripCount = 0;
  for (let i = 0; i < 250; i++) {
    const type = pick(["ride", "ride", "ride", "delivery", "delivery"]);
    const status = pick(["completed", "completed", "completed", "completed", "cancelled", "in_progress", "pending"]);
    const fare = Number((rand(10, 120) + Math.random()).toFixed(2));
    const driverId = pick(driverIds);
    const customerId = pick(customerIds);
    const created = daysAgo(rand(0, 60));
    const commission = Number((fare * 0.15).toFixed(2));
    const tripCity = pick(cities);
    const [pcLat, pcLng] = cityCoords[tripCity];
    const pickupLat = Number((pcLat + jitter()).toFixed(5));
    const pickupLng = Number((pcLng + jitter()).toFixed(5));
    const dropLat = Number((pcLat + jitter()).toFixed(5));
    const dropLng = Number((pcLng + jitter()).toFixed(5));
    const t = await prisma.trip.create({
      data: {
        number: `HG-${100000 + i}`,
        type,
        status,
        customerId,
        driverId: status === "pending" ? null : driverId,
        vendorId: type === "delivery" ? pick(vendorIds) : null,
        pickupAddress: `${pick(addresses)}، ${tripCity}`,
        pickupLat,
        pickupLng,
        dropAddress: `${pick(addresses)}، ${tripCity}`,
        dropLat,
        dropLng,
        city: tripCity,
        distance: Number((Math.random() * 25 + 1).toFixed(1)),
        duration: rand(5, 55),
        fare,
        commission,
        paymentMethod: pick(["cash", "cash", "wallet", "card"]),
        paymentStatus: status === "cancelled" ? "refunded" : "paid",
        rating: status === "completed" ? rand(3, 5) : null,
        scheduledAt: status === "pending" && Math.random() > 0.5 ? daysAgo(-rand(1, 5)) : null,
        createdAt: created,
      },
    });
    tripCount++;
    if (status === "completed") {
      await prisma.transaction.create({
        data: { type: type === "ride" ? "ride_payment" : "order_payment", amount: fare, actorType: "customer", actorId: customerId, refId: t.id, createdAt: created },
      });
      await prisma.transaction.create({
        data: { type: "commission", amount: commission, actorType: "platform", refId: t.id, createdAt: created },
      });
    }
  }
  console.log(`✅ ${tripCount} رحلة + معاملاتها`);

  // ===== المراجعات (تقييمات نصية بعد الرحلات) =====
  const goodComments = [
    "سائق محترف وملتزم بالمواعيد",
    "رحلة ممتازة وسيارة نظيفة",
    "تعامل راقٍ وقيادة آمنة",
    "وصل بسرعة وكان لطيفاً جداً",
    "خدمة رائعة، أنصح به",
    "كل شيء كان مثالياً",
  ];
  const badComments = [
    "تأخّر في الوصول قليلاً",
    "القيادة كانت سريعة بعض الشيء",
    "السيارة تحتاج إلى تنظيف",
    "لم يكن ودوداً في التعامل",
    "سلك طريقاً أطول من اللازم",
  ];
  const completedTripsForReview = await prisma.trip.findMany({
    where: { status: "completed", driverId: { not: null } },
    include: { customer: true, driver: true },
    take: 150,
  });
  let reviewCount = 0;
  for (const tr of completedTripsForReview) {
    if (Math.random() > 0.7) continue; // ليست كل رحلة لها مراجعة
    const stars = tr.rating ?? rand(3, 5);
    const isGood = stars >= 4;
    await prisma.review.create({
      data: {
        tripId: tr.id,
        tripNo: tr.number,
        fromType: "customer",
        fromId: tr.customerId,
        fromName: tr.customer?.name ?? null,
        toType: "driver",
        toId: tr.driverId,
        toName: tr.driver?.name ?? null,
        stars,
        comment: Math.random() > 0.3 ? (isGood ? pick(goodComments) : pick(badComments)) : null,
        hidden: Math.random() > 0.95,
        createdAt: tr.createdAt,
      },
    });
    reviewCount++;
  }
  console.log(`✅ ${reviewCount} مراجعة`);

  // ===== سجل التدقيق (أمثلة) =====
  const auditActions = [
    { action: "approve_driver", entity: "driver" },
    { action: "suspend_driver", entity: "driver" },
    { action: "approve_withdrawal", entity: "withdrawal" },
    { action: "cancel_trip", entity: "trip" },
    { action: "refund_trip", entity: "trip" },
    { action: "approve_document", entity: "document" },
    { action: "reject_document", entity: "document" },
    { action: "hide_review", entity: "review" },
  ];
  for (let i = 0; i < 15; i++) {
    const a = pick(auditActions);
    await prisma.auditLog.create({
      data: {
        actorId: 1,
        actorName: pick(["مدير النظام", "مشرف العمليات"]),
        actorRole: pick(["super_admin", "operations"]),
        action: a.action,
        entity: a.entity,
        entityId: rand(1, 50),
        createdAt: daysAgo(rand(0, 20)),
      },
    });
  }
  console.log("✅ سجل التدقيق");

  // ===== طلبات السحب =====
  for (let i = 0; i < 18; i++) {
    await prisma.withdrawalRequest.create({
      data: {
        driverId: pick(driverIds),
        amount: Number((rand(100, 2000)).toFixed(2)),
        method: pick(["bank", "wallet"]),
        status: pick(["pending", "pending", "approved", "rejected"]),
        createdAt: daysAgo(rand(0, 30)),
      },
    });
  }
  console.log("✅ طلبات سحب");

  // ===== الكوبونات =====
  const promos = [
    { code: "WELCOME20", type: "percentage", value: 20, minOrder: 30, service: "all" },
    { code: "RIDE10", type: "fixed", value: 10, minOrder: 0, service: "ride" },
    { code: "FOOD15", type: "percentage", value: 15, minOrder: 50, service: "delivery" },
    { code: "SUMMER50", type: "fixed", value: 50, minOrder: 100, service: "all" },
    { code: "NEWUSER", type: "percentage", value: 25, minOrder: 20, service: "all" },
  ];
  for (const p of promos) {
    await prisma.promo.create({
      data: {
        ...p,
        maxDiscount: p.type === "percentage" ? 50 : null,
        usageLimit: rand(50, 500),
        usedCount: rand(0, 49),
        validTo: daysAgo(-rand(10, 90)),
        status: "active",
      },
    });
  }
  console.log("✅ كوبونات");

  // ===== قواعد التسعير =====
  const pricingRules = [
    { vehicleType: "car", serviceType: "ride", distanceUnit: "km", baseFare: 5, bookingFee: 2, perKm: 1.6, perMinute: 0.4, waitPerMinute: 0.5, freeWaitMinutes: 5, minimumFare: 10, cancellationFee: 5, taxPercent: 15 },
    { vehicleType: "motorcycle", serviceType: "ride", distanceUnit: "km", baseFare: 3, bookingFee: 1, perKm: 1.0, perMinute: 0.3, waitPerMinute: 0.3, freeWaitMinutes: 5, minimumFare: 6, cancellationFee: 3, taxPercent: 15 },
    { vehicleType: "car", serviceType: "delivery", distanceUnit: "km", baseFare: 4, bookingFee: 2, perKm: 1.2, perMinute: 0.2, waitPerMinute: 0.4, freeWaitMinutes: 5, minimumFare: 8, cancellationFee: 4, taxPercent: 15 },
  ];
  for (const r of pricingRules) {
    await prisma.pricingRule.create({ data: { ...r, currency: "ر.س", active: true } });
  }
  console.log("✅ قواعد التسعير");

  // ===== أسعار الذروة =====
  const surgeRules = [
    { name: "ذروة الصباح", days: "0,1,2,3,4", startHour: 7, endHour: 9, multiplier: 1.5 },
    { name: "ذروة المساء", days: "0,1,2,3,4", startHour: 17, endHour: 20, multiplier: 1.8 },
    { name: "ليالي نهاية الأسبوع", days: "4,5", startHour: 20, endHour: 24, multiplier: 1.3 },
  ];
  for (const s of surgeRules) {
    await prisma.surgeRule.create({ data: { ...s, active: true } });
  }
  console.log("✅ أسعار الذروة");

  // ===== مناطق التشغيل =====
  const zoneMultipliers: Record<string, number> = {
    "الرياض": 1.2, "جدة": 1.15, "الدمام": 1.1, "مكة": 1.25,
    "المدينة": 1.0, "الطائف": 0.95, "تبوك": 0.9, "أبها": 0.9,
  };
  for (const [city, mult] of Object.entries(zoneMultipliers)) {
    const [lat, lng] = cityCoords[city];
    await prisma.zone.create({
      data: { name: `منطقة ${city}`, city, centerLat: lat, centerLng: lng, radiusKm: 25, priceMultiplier: mult, active: true },
    });
  }
  console.log("✅ مناطق التشغيل");

  // ===== فئات المركبات (UberX/Comfort/XL/Black) =====
  const classes = [
    { key: "economy", name: "اقتصادي", multiplier: 1.0, capacity: 4, sortOrder: 1 },
    { key: "comfort", name: "مريح", multiplier: 1.3, capacity: 4, sortOrder: 2 },
    { key: "xl", name: "عائلي XL", multiplier: 1.7, capacity: 6, sortOrder: 3 },
    { key: "black", name: "فاخر Black", multiplier: 2.5, capacity: 4, sortOrder: 4 },
  ];
  for (const c of classes) await prisma.vehicleClass.create({ data: { ...c, active: true } });
  console.log("✅ فئات المركبات");

  // ===== الرسوم الخاصة =====
  const fees = [
    { key: "airport", name: "رسوم المطار", amount: 15 },
    { key: "toll", name: "رسوم الجسور/الطرق", amount: 5 },
    { key: "night", name: "رسوم ليلية", amount: 8 },
  ];
  for (const f of fees) await prisma.extraFee.create({ data: { ...f, active: true } });
  console.log("✅ الرسوم الخاصة");

  // ===== الإعدادات =====
  const settings: Record<string, string> = {
    app_name: "HalaGo",
    currency: "ر.س",
    default_commission: "15",
    base_fare: "5",
    per_km: "1.5",
    per_minute: "0.5",
    minimum_fare: "10",
    cancellation_fee: "5",
    surge_enabled: "true",
    support_phone: "920000000",
    support_email: "support@halago.com",
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.create({ data: { key, value } });
  }
  console.log("✅ الإعدادات");

  // ===== تنبيهات الطوارئ =====
  const sosReasons = ["panic", "accident", "unsafe_driver", "unsafe_passenger", "medical", "route_deviation", "other"];
  const sosSeverities = ["critical", "high", "high", "medium", "low"];
  const sosStatuses = ["open", "open", "in_progress", "resolved", "resolved", "dismissed"];
  const sampleNotes = [
    "السائق يقود بسرعة عالية جداً",
    "حادث بسيط في طريق العودة، نحتاج تأكيد سلامة الراكب",
    "العميل في حالة طبية طارئة",
    "ضغطت زر الطوارئ بالخطأ — كل شيء على ما يرام",
    "السائق سلك طريقاً غير متوقع",
    "أشعر بعدم الأمان مع هذا الراكب",
  ];
  const recentTrips = await prisma.trip.findMany({
    where: { status: { in: ["in_progress", "completed", "accepted"] } },
    include: { customer: true, driver: true },
    take: 60,
  });
  let sosCount = 0;
  for (let i = 0; i < 22; i++) {
    const tr = pick(recentTrips);
    if (!tr) break;
    const reporterIsDriver = Math.random() > 0.55;
    const reason = pick(sosReasons);
    const severity = reason === "accident" || reason === "medical" ? "critical" : pick(sosSeverities);
    const status = pick(sosStatuses);
    const created = daysAgo(rand(0, 14));
    await prisma.sosAlert.create({
      data: {
        reporterType: reporterIsDriver ? "driver" : "customer",
        reporterId: reporterIsDriver ? tr.driverId : tr.customerId,
        reporterName: reporterIsDriver ? tr.driver?.name ?? null : tr.customer?.name ?? null,
        reporterPhone: reporterIsDriver ? tr.driver?.phone ?? null : tr.customer?.phone ?? null,
        tripId: tr.id,
        tripNumber: tr.number,
        lat: tr.pickupLat,
        lng: tr.pickupLng,
        city: tr.city,
        reason,
        severity,
        status,
        note: pick(sampleNotes),
        resolution:
          status === "resolved" ? "تم التواصل مع الطرفين والتأكد من السلامة، أُغلق التنبيه بدون متابعة قانونية." : status === "dismissed" ? "تنبيه خاطئ — لا حاجة لاتخاذ إجراء." : null,
        handlerName: status !== "open" ? pick(["مدير النظام", "مشرف العمليات"]) : null,
        handlerId: status !== "open" ? 1 : null,
        resolvedAt: status === "resolved" || status === "dismissed" ? new Date(created.getTime() + rand(5, 120) * 60_000) : null,
        createdAt: created,
      },
    });
    sosCount++;
  }
  console.log(`✅ ${sosCount} تنبيه طوارئ`);

  // ===== تذاكر الدعم =====
  const ticketSubjects = [
    "مشكلة في الدفع برصيد المحفظة",
    "السائق لم يصل في الوقت المحدد",
    "نسيت حقيبتي في السيارة",
    "رحلة بفاتورة أعلى من المتوقع",
    "أحتاج إلى استرداد مبلغ الرحلة",
    "خطأ تقني عند تسجيل الدخول",
    "السائق ألغى الرحلة قبل الوصول",
    "تغيير في وسيلة الدفع الافتراضية",
    "تقييم خاطئ ظهر على حسابي",
    "العنوان لم يُحدّث على الخريطة",
    "اشتراك في برنامج المكافآت",
    "طلب فاتورة ضريبية لرحلة",
  ];
  const ticketBodies = [
    "تواصلت معكم سابقاً ولم يصلني أي رد، أرجو المتابعة العاجلة",
    "هل بالإمكان مراجعة الموقف بأسرع وقت؟ أحتاج المساعدة",
    "أرفقت سابقاً صورة من الفاتورة وأنتظر الردّ",
    "العميل المحترم، الرجاء التحقق من سجلّ الرحلة وإفادتي",
    "أرجو إيضاح كيف تمّ احتساب المبلغ",
  ];
  const ticketCats = ["general", "trip_issue", "payment", "account", "driver_complaint", "lost_item", "refund_request", "technical", "other"];
  const ticketPrios = ["low", "normal", "normal", "high", "urgent"];
  const ticketStatuses = ["open", "open", "in_progress", "in_progress", "waiting_user", "resolved", "closed"];
  const customersForTickets = await prisma.customer.findMany({ take: 30 });
  const driversForTickets = await prisma.driver.findMany({ where: { status: "approved" }, take: 20 });
  for (let i = 0; i < 28; i++) {
    const isDriver = Math.random() > 0.6;
    const reporter = isDriver ? pick(driversForTickets) : pick(customersForTickets);
    if (!reporter) continue;
    const linkedTrip = pick(recentTrips);
    const cat = pick(ticketCats);
    const prio = pick(ticketPrios);
    const st = pick(ticketStatuses);
    const created = daysAgo(rand(0, 25));
    const ticket = await prisma.supportTicket.create({
      data: {
        number: `HG-T-${1000 + i}`,
        subject: pick(ticketSubjects),
        body: pick(ticketBodies),
        category: cat,
        priority: prio,
        status: st,
        reporterType: isDriver ? "driver" : "customer",
        reporterId: reporter.id,
        reporterName: reporter.name,
        reporterEmail: (reporter as any).email ?? null,
        reporterPhone: reporter.phone,
        tripId: linkedTrip?.id ?? null,
        tripNumber: linkedTrip?.number ?? null,
        assigneeId: st !== "open" ? 1 : null,
        assigneeName: st !== "open" ? pick(["مدير النظام", "مشرف العمليات"]) : null,
        lastReplyBy: st === "waiting_user" ? "admin" : st === "in_progress" ? "user" : null,
        lastReplyAt: st !== "open" ? new Date(created.getTime() + rand(10, 240) * 60_000) : null,
        closedAt: st === "closed" ? new Date(created.getTime() + rand(1, 6) * 86400_000) : null,
        createdAt: created,
      },
    });
    // محادثة قصيرة لبعض التذاكر
    if (st !== "open" && Math.random() > 0.3) {
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderType: "admin",
          senderId: 1,
          senderName: ticket.assigneeName,
          body: "شكراً لتواصلك معنا، نراجع طلبك ونعود إليك بأقرب وقت.",
          createdAt: new Date(created.getTime() + 30 * 60_000),
        },
      });
      if (Math.random() > 0.5) {
        await prisma.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            senderType: "user",
            senderId: reporter.id,
            senderName: reporter.name,
            body: "بانتظار تحديثكم، شكراً.",
            createdAt: new Date(created.getTime() + 90 * 60_000),
          },
        });
      }
    }
  }
  console.log("✅ 28 تذكرة دعم");

  // ===== ورديات السائقين =====
  const approvedDrivers = await prisma.driver.findMany({ where: { status: "approved" }, select: { id: true, city: true, available: true } });
  let shiftCount = 0;
  for (const d of approvedDrivers) {
    // 1-4 ورديات لكل سائق
    const shifts = rand(1, 4);
    for (let s = 0; s < shifts; s++) {
      const isActive = s === 0 && d.available && Math.random() > 0.4;
      const startedAt = daysAgo(rand(0, 25));
      startedAt.setHours(rand(6, 12), rand(0, 59), 0, 0);
      const durationMin = isActive ? Math.round((Date.now() - startedAt.getTime()) / 60000) : rand(120, 540);
      const endedAt = isActive ? null : new Date(startedAt.getTime() + durationMin * 60_000);
      const totalTrips = isActive ? rand(0, 8) : rand(3, 22);
      const cancelled = Math.max(0, Math.round(totalTrips * 0.1));
      const completed = Math.max(0, totalTrips - cancelled);
      const totalEarnings = Number((completed * rand(15, 45) + Math.random() * 20).toFixed(2));
      const totalKm = Number((completed * (Math.random() * 8 + 3)).toFixed(1));
      await prisma.driverShift.create({
        data: {
          driverId: d.id,
          startedAt,
          endedAt,
          durationMin,
          totalTrips,
          completedTrips: completed,
          cancelledTrips: cancelled,
          totalEarnings,
          totalKm,
          city: d.city,
          status: isActive ? "active" : "ended",
        },
      });
      shiftCount++;
    }
  }
  console.log(`✅ ${shiftCount} وردية سائق`);

  // ===== أكواد الإحالة + الإحالات =====
  const customers = await prisma.customer.findMany({ take: 60 });
  const drivers = await prisma.driver.findMany({ where: { status: "approved" }, take: 20 });
  const codeIds: number[] = [];
  for (const c of customers.slice(0, 35)) {
    const code = `HG${String(c.id).padStart(4, "0")}`;
    const rc = await prisma.referralCode.create({
      data: {
        code,
        ownerType: "customer",
        ownerId: c.id,
        ownerName: c.name,
        rewardPerUse: pick([10, 15, 20, 25]),
        usageCount: 0,
        active: true,
      },
    });
    codeIds.push(rc.id);
  }
  for (const d of drivers.slice(0, 10)) {
    const code = `HGD${String(d.id).padStart(3, "0")}`;
    const rc = await prisma.referralCode.create({
      data: {
        code,
        ownerType: "driver",
        ownerId: d.id,
        ownerName: d.name,
        rewardPerUse: pick([20, 30, 50]),
        usageCount: 0,
        active: true,
      },
    });
    codeIds.push(rc.id);
  }
  // إنشاء إحالات
  let refCount = 0;
  for (let i = 0; i < 45; i++) {
    const codeRow = await prisma.referralCode.findUnique({ where: { id: pick(codeIds) } });
    if (!codeRow) continue;
    const referee = codeRow.ownerType === "driver" ? pick(drivers) : pick(customers);
    if (!referee || referee.id === codeRow.ownerId) continue;
    const status = pick(["pending", "completed", "completed", "rewarded", "rewarded", "cancelled"]);
    const created = daysAgo(rand(0, 40));
    const reward = codeRow.rewardPerUse;
    await prisma.referral.create({
      data: {
        codeId: codeRow.id,
        code: codeRow.code,
        referrerType: codeRow.ownerType,
        referrerId: codeRow.ownerId,
        referrerName: codeRow.ownerName,
        refereeType: codeRow.ownerType === "driver" ? "driver" : "customer",
        refereeId: referee.id,
        refereeName: referee.name,
        status,
        reward: status === "rewarded" ? reward : 0,
        rewardedAt: status === "rewarded" ? new Date(created.getTime() + rand(1, 5) * 86400_000) : null,
        completedAt: status === "completed" || status === "rewarded" ? new Date(created.getTime() + rand(1, 3) * 86400_000) : null,
        createdAt: created,
      },
    });
    refCount++;
    await prisma.referralCode.update({ where: { id: codeRow.id }, data: { usageCount: { increment: 1 } } });
  }
  console.log(`✅ ${codeIds.length} كود إحالة + ${refCount} إحالة`);

  // ===== علامات احتيال يدوية للديمو (تعكس ما سيكتشفه المحرّك من بيانات حقيقية) =====
  const fraudReasons = [
    { reason: "high_cancel_rate", severity: "high", score: 78, ev: { window_days: 7, total_trips: 14, cancelled: 8, cancel_rate: 0.571 } },
    { reason: "rating_streak", severity: "high", score: 70, ev: { last_5_ratings: [2, 1, 2, 1, 2] } },
    { reason: "impossible_speed", severity: "high", score: 92, ev: { distance_km: 28.4, duration_min: 6, avg_speed_kmh: 284 } },
    { reason: "duplicate_phone", severity: "high", score: 80, ev: { phone: "0501234567", account_count: 3, sibling_ids: [101, 102] } },
    { reason: "refund_abuse", severity: "medium", score: 65, ev: { window_days: 7, refund_count: 4 } },
    { reason: "high_cancel_rate", severity: "medium", score: 55, ev: { window_days: 7, total_trips: 9, cancelled: 4, cancel_rate: 0.444 } },
    { reason: "gps_jump", severity: "medium", score: 60, ev: { distance_traveled_km: 0.1, time_elapsed_s: 1, implied_speed_kmh: 360 } },
    { reason: "multi_account", severity: "medium", score: 58, ev: { same_device_id: "DEV-7Z3A2", linked_accounts: 4 } },
    { reason: "rating_streak", severity: "medium", score: 55, ev: { last_5_ratings: [2, 2, 3, 2, 2] } },
  ];
  const driversForFraud = await prisma.driver.findMany({ where: { status: "approved" }, take: 6 });
  const customersForFraud = await prisma.customer.findMany({ take: 8 });
  const tripsForFraud = await prisma.trip.findMany({ where: { status: "completed" }, take: 6 });
  const fraudSubjects = [
    ...driversForFraud.map((d) => ({ type: "driver" as const, id: d.id, ref: d.name })),
    ...customersForFraud.map((c) => ({ type: "customer" as const, id: c.id, ref: c.name })),
    ...tripsForFraud.map((t) => ({ type: "trip" as const, id: t.id, ref: t.number })),
  ];
  let fraudCount = 0;
  for (let i = 0; i < 12; i++) {
    const f = pick(fraudReasons);
    const s = pick(fraudSubjects);
    const status = pick(["open", "open", "open", "reviewing", "confirmed", "dismissed"]);
    const created = daysAgo(rand(0, 10));
    await prisma.fraudFlag.create({
      data: {
        subjectType: s.type,
        subjectId: s.id,
        subjectRef: s.ref,
        reason: f.reason,
        score: f.score,
        severity: f.severity,
        status,
        evidence: JSON.stringify(f.ev),
        handlerId: status !== "open" ? 1 : null,
        handlerName: status !== "open" ? "مشرف العمليات" : null,
        resolvedAt: status === "confirmed" || status === "dismissed" ? new Date(created.getTime() + rand(1, 24) * 3600_000) : null,
        createdAt: created,
      },
    });
    fraudCount++;
  }
  console.log(`✅ ${fraudCount} علامة احتيال (ديمو)`);

  // ===== فحوصات المركبات (Vehicle Inspections) =====
  const checklistItems = [
    { key: "body_clean", label: "نظافة الهيكل الخارجي" },
    { key: "no_dents", label: "خلو الهيكل من الانبعاجات" },
    { key: "lights", label: "الأضواء (أمامية/خلفية/إشارات)" },
    { key: "tires", label: "حالة الإطارات" },
    { key: "windows", label: "سلامة الزجاج" },
    { key: "seats", label: "نظافة المقاعد" },
    { key: "seatbelts", label: "أحزمة الأمان لكل المقاعد" },
    { key: "ac", label: "عمل التكييف" },
    { key: "odor", label: "خلو من الروائح" },
    { key: "fluids", label: "مستويات السوائل" },
    { key: "no_warning_lights", label: "خلو لوحة العدّاد من تحذيرات" },
    { key: "brakes", label: "كفاءة المكابح" },
    { key: "registration_valid", label: "استمارة سارية" },
    { key: "insurance_valid", label: "تأمين ساري" },
    { key: "fire_extinguisher", label: "وجود طفاية حريق" },
    { key: "spare_tire", label: "إطار احتياطي" },
    { key: "first_aid", label: "حقيبة إسعافات" },
  ];
  const approvedDriversForInsp = await prisma.driver.findMany({ where: { status: "approved" }, take: 20 });
  let inspCount = 0;
  for (const d of approvedDriversForInsp) {
    const n = rand(1, 3);
    for (let i = 0; i < n; i++) {
      // فشل بعض البنود عشوائياً (10-20%)
      const items = checklistItems.map((c) => ({
        key: c.key,
        label: c.label,
        ok: Math.random() > 0.15,
        note: null,
      }));
      const failedCount = items.filter((x) => !x.ok).length;
      const damageScore = Math.min(100, failedCount * 12 + rand(0, 20));
      const status = damageScore > 50 ? "flagged" : Math.random() > 0.6 ? "submitted" : pick(["approved", "approved", "submitted"]);
      await prisma.vehicleInspection.create({
        data: {
          driverId: d.id,
          type: pick(["pre_trip", "post_trip", "pre_trip", "periodic"]),
          odometerKm: rand(15_000, 220_000),
          items: JSON.stringify(items),
          photos: JSON.stringify([]),
          notes: failedCount > 0 ? "بعض البنود تحتاج صيانة" : null,
          damageScore,
          status,
          reviewerId: status !== "submitted" ? 1 : null,
          reviewerName: status !== "submitted" ? "مشرف العمليات" : null,
          reviewedAt: status !== "submitted" ? daysAgo(rand(0, 7)) : null,
          createdAt: daysAgo(rand(0, 30)),
        },
      });
      inspCount++;
    }
  }
  console.log(`✅ ${inspCount} فحص مركبة`);

  // ===== أسباب الإلغاء =====
  const reasons = [
    { key: "late_driver", labelAr: "السائق متأخر جداً", labelEn: "Driver is too late", audience: "customer", sortOrder: 1 },
    { key: "changed_mind", labelAr: "غيّرت رأيي", labelEn: "Changed my mind", audience: "customer", sortOrder: 2 },
    { key: "fare_too_high", labelAr: "الأجرة أعلى من المتوقع", labelEn: "Fare is too high", audience: "customer", sortOrder: 3 },
    { key: "wrong_pickup", labelAr: "نقطة الالتقاط خاطئة", labelEn: "Pickup point is wrong", audience: "customer", sortOrder: 4 },
    { key: "customer_no_show", labelAr: "العميل لم يحضر", labelEn: "Customer did not show up", audience: "driver", sortOrder: 5 },
    { key: "wrong_destination", labelAr: "الوجهة غير صحيحة", labelEn: "Wrong destination", audience: "driver", sortOrder: 6 },
    { key: "vehicle_issue", labelAr: "مشكلة في المركبة", labelEn: "Vehicle issue", audience: "driver", sortOrder: 7 },
    { key: "safety_concern", labelAr: "مخاوف تتعلّق بالسلامة", labelEn: "Safety concern", audience: "both", sortOrder: 8 },
    { key: "other", labelAr: "سبب آخر", labelEn: "Other reason", audience: "both", sortOrder: 99 },
  ];
  for (const r of reasons) {
    await prisma.cancellationReason.create({ data: { ...r, active: true } });
  }
  console.log(`✅ ${reasons.length} سبب إلغاء`);

  // ===== قائمة حظر =====
  const blockKinds = [
    { kind: "phone", value: "0500000001", reason: "محاولات احتيال متعدّدة" },
    { kind: "phone", value: "0500000002", reason: "تعرّض لسائق" },
    { kind: "email", value: "spam@example.com", reason: "spam" },
    { kind: "id_number", value: "1234567890", reason: "بطاقة هوية مزوّرة" },
    { kind: "device_id", value: "DEV-7Z3A2-FAKE", reason: "device farm — حسابات متعدّدة" },
    { kind: "phone", value: "0500000003", reason: "كوبونات استغلال متكرّر" },
  ];
  for (const b of blockKinds) {
    await prisma.blockedEntity.create({
      data: {
        ...b,
        blockedById: 1,
        blockedByName: "مدير النظام",
        active: true,
        expiresAt: Math.random() > 0.7 ? new Date(Date.now() + rand(30, 365) * 86400_000) : null,
        createdAt: daysAgo(rand(0, 60)),
      },
    });
  }
  console.log(`✅ ${blockKinds.length} قيد حظر`);

  // ===== قوالب إشعارات =====
  const tmpls = [
    {
      key: "trip_confirmed",
      name: "تأكيد قبول الرحلة",
      title: "السائق في الطريق إليك",
      body: "مرحباً {{name}}، تم تعيين السائق لرحلتك {{trip_no}} وسيصل خلال {{eta}} دقائق.",
      audience: "customers",
    },
    {
      key: "trip_arrived",
      name: "السائق وصل",
      title: "السائق وصل!",
      body: "وصل السائق إلى نقطة الالتقاط، رحلتك {{trip_no}} بانتظارك.",
      audience: "customers",
    },
    {
      key: "promo_new",
      name: "كوبون خصم جديد",
      title: "كوبون جديد لك — {{code}}",
      body: "احصل على خصم {{percent}}% على رحلتك القادمة بالكوبون {{code}}. صالح حتى {{date}}.",
      audience: "customers",
    },
    {
      key: "driver_low_rating",
      name: "تنبيه انخفاض التقييم",
      title: "تنبيه: تقييمك انخفض",
      body: "مرحباً {{name}}، تقييمك انخفض إلى {{rating}}. حافظ على جودة الخدمة لتجنّب التعليق.",
      audience: "drivers",
    },
    {
      key: "withdrawal_approved",
      name: "تمت الموافقة على السحب",
      title: "تمت الموافقة على طلب سحبك",
      body: "تمت الموافقة على طلب سحب بمبلغ {{amount}}، سيصل لحسابك خلال 1-3 أيام عمل.",
      audience: "drivers",
    },
    {
      key: "vendor_new_order",
      name: "طلب جديد للمتجر",
      title: "طلب جديد رقم {{order_no}}",
      body: "وصل طلب جديد بقيمة {{total}} من العميل {{customer}}.",
      audience: "all",
    },
  ];
  for (const tpl of tmpls) {
    const vars: string[] = [];
    const titleMatches = Array.from(tpl.title.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi));
    const bodyMatches = Array.from(tpl.body.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi));
    [...titleMatches, ...bodyMatches].forEach((m) => {
      if (!vars.includes(m[1])) vars.push(m[1]);
    });
    await prisma.notificationTemplate.create({
      data: { ...tpl, variables: JSON.stringify(vars), active: true },
    });
  }
  console.log(`✅ ${tmpls.length} قالب إشعار`);

  // ===== العملات المدعومة (SAR base) =====
  const currencies = [
    { code: "SAR", name: "Saudi Riyal", nameAr: "ريال سعودي", symbol: "ر.س", fxRate: 1, isBase: true, sortOrder: 0 },
    { code: "USD", name: "US Dollar", nameAr: "دولار أمريكي", symbol: "$", fxRate: 0.267, isBase: false, sortOrder: 1 },
    { code: "EUR", name: "Euro", nameAr: "يورو", symbol: "€", fxRate: 0.247, isBase: false, sortOrder: 2 },
    { code: "AED", name: "UAE Dirham", nameAr: "درهم إماراتي", symbol: "د.إ", fxRate: 0.98, isBase: false, sortOrder: 3 },
    { code: "EGP", name: "Egyptian Pound", nameAr: "جنيه مصري", symbol: "ج.م", fxRate: 13.2, isBase: false, sortOrder: 4 },
    { code: "JOD", name: "Jordanian Dinar", nameAr: "دينار أردني", symbol: "د.أ", fxRate: 0.19, isBase: false, sortOrder: 5 },
  ];
  for (const c of currencies) await prisma.currency.create({ data: { ...c, active: true } });
  console.log(`✅ ${currencies.length} عملة مدعومة`);

  // ===== Breadcrumbs لرحلات مكتملة (Trip Replay) =====
  const tripsForReplay = await prisma.trip.findMany({
    where: {
      status: "completed",
      pickupLat: { not: null },
      pickupLng: { not: null },
      dropLat: { not: null },
      dropLng: { not: null },
    },
    take: 40,
    select: { id: true, pickupLat: true, pickupLng: true, dropLat: true, dropLng: true, duration: true, createdAt: true },
  });
  let bcCount = 0;
  for (const tr of tripsForReplay) {
    // عدد نقاط ~ كل دقيقة، حد أدنى 20، أقصى 80
    const n = Math.max(20, Math.min(80, tr.duration || 30));
    const startTime = new Date(tr.createdAt).getTime();
    const minutesTotal = (tr.duration || 30);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      // مسار شبه مستقيم مع jitter بسيط لمحاكاة المنعطفات
      const jitter = Math.sin(t * Math.PI * 4) * 0.003;
      const lat = tr.pickupLat! + (tr.dropLat! - tr.pickupLat!) * t + jitter;
      const lng = tr.pickupLng! + (tr.dropLng! - tr.pickupLng!) * t + jitter * 0.7;
      const speed = 25 + Math.random() * 50; // 25-75 km/h
      const recordedAt = new Date(startTime + ((minutesTotal * 60_000) * t));
      await prisma.tripBreadcrumb.create({
        data: { tripId: tr.id, sequence: i, lat, lng, speed, recordedAt },
      });
      bcCount++;
    }
  }
  console.log(`✅ ${bcCount} نقطة مسار لـ ${tripsForReplay.length} رحلة`);

  console.log("\n🎉 تمت تعبئة قاعدة البيانات بنجاح!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
