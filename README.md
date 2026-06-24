# HalaGo CMS

> 🚖 منصّة إدارة متكاملة بنمط Uber/Careem — Next.js 14 Full-stack مع قاعدة Postgres حقيقية، ثنائية اللغة (عربي RTL / إنجليزي LTR)، 37 صفحة، 75+ API، وعلامة جاهزية ZATCA Phase 1.

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14.2-black?logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/i18n-AR%20%2F%20EN-orange" />
  <img src="https://img.shields.io/badge/ZATCA-Phase%201-green" />
  <img src="https://img.shields.io/badge/Production-Ready-success" />
</p>

---

## ⚡ التشغيل السريع

```bash
# 1. الاعتماديات
npm install

# 2. متغيّرات البيئة
cp .env.example .env
# عدّل DATABASE_URL / DIRECT_URL / JWT_SECRET

# 3. قاعدة البيانات + بيانات تجريبية
npm run db:push
npm run db:seed

# 4. تشغيل
npm run dev          # تطوير → http://localhost:3000
npm run build        # بناء إنتاج
npm start            # تشغيل إنتاج
```

**الدخول الافتراضي:** `admin@halago.com` / `password`

| الحساب | الدور |
|---|---|
| `admin@halago.com` | `super_admin` (كل الصلاحيات) |
| `ops@halago.com` | `operations` |
| `vendor@halago.com` | `vendor` (بوّابة التاجر فقط) |

---

## 🚀 النشر على Vercel

اقرأ الدليل الكامل في [`DEPLOY-VERCEL.md`](./DEPLOY-VERCEL.md) — خطوات مدعومة + استكشاف أخطاء.

نسخة سريعة:
1. ادفع الكود لـ GitHub (✓ هذا الـ repo)
2. ادخل [vercel.com/new](https://vercel.com/new) واستورد المشروع
3. أضف `DATABASE_URL` + `DIRECT_URL` + `JWT_SECRET` في Environment Variables
4. اضغط Deploy ✓

> الإعدادات مُجهّزة: `vercel.json` بـ region `fra1`، Prisma `binaryTargets` لـ Vercel، و `maxDuration` لكل API ثقيل.

---

## 🏗️ المكدِّس التقني

| الطبقة | الأداة |
|---|---|
| الإطار | **Next.js 14** App Router (Full-stack) |
| اللغة | **TypeScript 5** |
| قاعدة البيانات | **PostgreSQL** على Neon (serverless) |
| الـ ORM | **Prisma 5.22** (20 موديل) |
| المصادقة | JWT (jose) في كوكي httpOnly + bcryptjs |
| الواجهة | **Tailwind CSS 3.4** + shadcn-style components |
| البيانات | **TanStack Query** (React Query 5) |
| الرسوم | **Recharts 2.15** |
| الخرائط | **Leaflet** + OpenStreetMap (بلا API key) |
| الترجمة | **next-intl** (AR/EN + RTL/LTR تلقائي) |
| QR | **qrcode** (TLV ZATCA-compliant) |
| النماذج | react-hook-form + zod |
| الإشعارات | sonner |

---

## 📦 الميزات الكاملة (30 وحدة موزّعة على 37 صفحة)

### 🏢 الأساسية (16)
لوحة التحكم • الخريطة الحيّة • السائقون (+تفاصيل+KYC) • العملاء (+تفاصيل) • الرحلات (+تفاصيل+dispatch) • المتاجر (+بوّابة التاجر) • المراجعات • المالية • طلبات السحب • الكوبونات • التسعير (6 تبويبات) • الإشعارات • التقارير • سجل التدقيق • المدراء (RBAC) • الإعدادات

### 🚀 باقة Uber Core (5)
**SOS/الطوارئ** (تحديث 8ث) • **تذاكر الدعم** (محادثة) • **الرحلات المجدولة** • **ورديات السائقين** • **خريطة الطلب الحرارية**

### 🛡️ باقة Uber-Grade (3)
**كشف الاحتيال** (6 قواعد heuristic + score + evidence) • **العمليات الجماعية** (drivers+withdrawals) • **برنامج الإحالة** (أكواد + صرف مكافآت → wallet)

### 📋 باقة المعايير المهنية (6)
**فحوصات المركبات** (17 بند + pass-rate) • **أسباب الإلغاء** • **قائمة الحظر** (phone/email/id/device) • **قوالب الإشعارات** ({{vars}} + معاينة) • **لوحة أرباح السائقين** • **الفواتير الضريبية** (ZATCA QR حقيقي)

### ⚡ باقة Production-Ready (6)
**لوحة الإرسال الحيّة** (polling 5ث) • **إعادة تشغيل الرحلة** (breadcrumbs + animated marker + seek) • **تعدّد العملات** (6 عملات seed) • **Rate Limiting** (sliding window) • **ZATCA QR حقيقي** (TLV base64) • **Reports بنطاق تاريخ** (preset + custom)

---

## 🗂️ بنية المشروع

```
cms/
├─ prisma/
│  ├─ schema.prisma          # 20 موديل (Driver/Customer/Trip/Vendor/SosAlert/...)
│  └─ seed.ts                # 30 سائق + 60 عميل + 250 رحلة + 1254 breadcrumb + ...
├─ messages/
│  ├─ ar.json                # 40+ namespace عربي
│  └─ en.json                # 40+ namespace إنجليزي
├─ src/
│  ├─ app/
│  │  ├─ api/                # 75+ REST endpoint (route handlers)
│  │  └─ [locale]/
│  │     ├─ login/
│  │     └─ (dashboard)/     # محمي بـ middleware + AuthGuard
│  │        └─ [37 صفحة...]
│  ├─ components/            # UI + layout + خرائط + bulk-bar + status-badge
│  ├─ services/index.ts      # كل استدعاءات الـ API بـ TypeScript types
│  ├─ lib/
│  │  ├─ prisma.ts           # Prisma client singleton
│  │  ├─ auth.ts             # JWT signing/verifying
│  │  ├─ api-helpers.ts      # requireAuth/requireModule (RBAC)
│  │  ├─ permissions.ts      # MODULES × ROLES matrix
│  │  ├─ rate-limit.ts       # in-memory sliding window
│  │  ├─ pricing.ts          # Uber-style fare calc engine
│  │  ├─ fraud.ts            # heuristic fraud detection
│  │  ├─ zatca.ts            # ZATCA TLV base64 + QR
│  │  └─ inspection-items.ts # default vehicle checklist
│  ├─ i18n/                  # next-intl routing + request
│  ├─ config/nav.ts          # nav items × role filtering
│  ├─ types/                 # shared interfaces
│  └─ middleware.ts          # locale + session redirects
├─ .env.example              # كل المتغيّرات موثَّقة بالعربي
├─ vercel.json               # region + maxDuration per API
├─ DEPLOY-VERCEL.md          # دليل النشر التفصيلي
└─ README.md                 # هذا الملف
```

---

## 🔐 RBAC — 5 أدوار × 30 وحدة

| الدور | الوحدات المُتاحة |
|---|---|
| `super_admin` | كل الـ 30 وحدة |
| `operations` | dashboard, map, heatmap, dispatch, drivers, shifts, vehicles, users, trips, scheduled, sos, fraud, blocklist, reviews, vendors, notifications, templates, cancellations, reports |
| `finance` | dashboard, finance, withdrawals, earnings, promotions, referrals, pricing, reports |
| `support` | dashboard, dispatch, users, drivers, trips, scheduled, sos, support, blocklist, reviews, notifications, templates |
| `vendor` | بوّابة منفصلة: my-store, my-menu, my-orders |

التحقّق على مستوى **الواجهة** (إخفاء عناصر nav) **والـ API** (`requireModule()`). جميع الإجراءات الحسّاسة (refund/cancel/approve/bulk/scan_fraud) مسجَّلة في `AuditLog`.

---

## 🌍 ثنائية اللغة (RTL/LTR)

- العربية افتراضية بـ `dir=rtl` تلقائياً
- زر تبديل اللغة في الـ Topbar (يحفظ في URL)
- 40+ namespace ترجمة كاملة
- الأرقام والتواريخ تستخدم locale المناسب
- المكوّنات تستخدم `start/end` بدل `left/right` لدعم RTL سلس

---

## 📊 البيانات الاختبارية (`npm run db:seed`)

| النوع | العدد |
|---|---|
| سائقون | 30 (بـ KYC documents) |
| عملاء | 60 |
| متاجر | 12 (بمنتجات) |
| رحلات | 250 (بإحداثيات pickup/drop حقيقية للمدن السعودية) |
| تنبيهات SOS | 22 |
| تذاكر دعم | 28 |
| ورديات سائقين | ~45 |
| أكواد إحالة | 45 (+ ~44 إحالة) |
| فحوصات مركبات | ~40 |
| Breadcrumbs (Trip Replay) | 1254 نقطة على 40 رحلة |
| عملات | 6 (SAR base + USD/EUR/AED/EGP/JOD) |
| علامات احتيال | 12 (ديمو) |

---

## 🛠️ أوامر مفيدة

```bash
npm run dev              # تطوير
npm run build            # بناء إنتاجي (يتضمّن prisma generate)
npm start                # تشغيل إنتاجي
npm run db:push          # تطبيق Schema على القاعدة
npm run db:seed          # تعبئة بيانات تجريبية
npm run db:reset         # إعادة ضبط القاعدة + تعبئة
npx prisma studio        # واجهة لتصفّح القاعدة (http://localhost:5555)
```

---

## 🤝 المساهمة

المشروع private حالياً. للاستفسارات: افتح Issue على هذا الـ repo.

## 📜 الترخيص

ملكية خاصّة — استخدام داخلي.

---

<sub>HalaGo CMS — Built with Next.js 14, Prisma, and lots of ☕  •  v1.1 — 2026-06-23</sub>
