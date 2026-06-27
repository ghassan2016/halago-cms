-- HalaGo CMS — Feature pass (27 نقطة)
-- جميع التغييرات إضافية وآمنة (حقول جديدة nullable أو بقيمة افتراضية)
-- شغّلها بـ: npx prisma migrate deploy   (أو npx prisma db push)

-- Driver: تصنيف + سبب الحظر
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'bronze';
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "banReason" TEXT;

-- Transaction: تعديلات يدوية / تعويضات
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "actorName" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "note" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "createdById" INTEGER;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "createdByName" TEXT;
CREATE INDEX IF NOT EXISTS "Transaction_actorType_actorId_idx" ON "Transaction"("actorType", "actorId");

-- Trip: التعيين التلقائي + تفاصيل الإلغاء
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "autoAssignedAt" TIMESTAMP(3);
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "cancelReasonKey" TEXT;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "cancelledBy" TEXT;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "cancelAction" TEXT;

-- CancellationReason: الإجراء والاسترداد
ALTER TABLE "CancellationReason" ADD COLUMN IF NOT EXISTS "actionType" TEXT NOT NULL DEFAULT 'auto_accept';
ALTER TABLE "CancellationReason" ADD COLUMN IF NOT EXISTS "refundPercent" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "CancellationReason" ADD COLUMN IF NOT EXISTS "chargeFee" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CancellationReason" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- ExtraFee: ربط جغرافي بالمناطق
ALTER TABLE "ExtraFee" ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'global';
ALTER TABLE "ExtraFee" ADD COLUMN IF NOT EXISTS "zoneId" INTEGER;
CREATE INDEX IF NOT EXISTS "ExtraFee_zoneId_idx" ON "ExtraFee"("zoneId");
