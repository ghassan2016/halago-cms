# HalaGo CMS — لوحة تحكم Full-Stack (Next.js)

لوحة تحكم إدارية كاملة لمنصة **HalaGo** للتوصيل — **الواجهة والـ Backend معاً داخل Next.js**، بقاعدة بيانات خاصة، **وثنائية اللغة عربي/إنجليزي** (RTL/LTR).

> لا تعتمد على Laravel نهائياً — كل شيء self-contained.

## ⚡ التشغيل السريع

```bash
cd cms
cp .env.example .env        # القيم الافتراضية تعمل مباشرة (SQLite)
npm install                 # يثبّت الحزم + يولّد Prisma Client
npm run db:push             # ينشئ قاعدة البيانات
npm run db:seed             # يعبّئ بيانات تجريبية
npm run dev                 # http://localhost:3000
```

ثم افتح المتصفح:
- عربي: http://localhost:3000/ar
- English: http://localhost:3000/en

## 🔐 الدخول

| الحقل | القيمة |
|------|--------|
| البريد | `admin@halago.com` |
| كلمة المرور | `password` |

(يوجد أيضاً `ops@halago.com / password` بدور operations)

## 🏗️ التقنيات

| الطبقة | التقنية |
|--------|---------|
| الإطار | Next.js 14 (App Router) — Full-stack |
| اللغة | TypeScript |
| قاعدة البيانات | **Prisma + SQLite** (ملف محلي، بلا خادم) |
| المصادقة | JWT (jose) في كوكي httpOnly + bcryptjs |
| الواجهة | Tailwind CSS + مكوّنات shadcn-style |
| البيانات | TanStack Query (React Query) |
| الرسوم | Recharts |
| الترجمة | **next-intl** (عربي/إنجليزي + RTL/LTR) |
| الإشعارات | Sonner |

## 📂 البنية

```
cms/
├─ prisma/
│  ├─ schema.prisma          # 10 نماذج (Admin, Driver, Customer, Vendor, Trip, ...)
│  └─ seed.ts                # بيانات تجريبية (30 سائق، 60 عميل، 250 رحلة...)
├─ messages/                 # ترجمات
│  ├─ ar.json
│  └─ en.json
├─ src/
│  ├─ app/
│  │  ├─ api/                # ★ الـ Backend (route handlers)
│  │  │  ├─ auth/ (login,logout,me)
│  │  │  ├─ dashboard/ drivers/ customers/ trips/
│  │  │  ├─ vendors/ transactions/ withdrawals/ promos/
│  │  │  └─ reports/ settings/
│  │  └─ [locale]/           # ★ الواجهة (مع بادئة اللغة)
│  │     ├─ login/
│  │     └─ (dashboard)/     # محمي
│  │        ├─ page.tsx (لوحة الإحصائيات)
│  │        ├─ drivers/ users/ trips/ vendors/
│  │        ├─ finance/ withdrawals/ promotions/
│  │        └─ reports/ settings/
│  ├─ components/            # UI + layout + حالات
│  ├─ services/index.ts      # استدعاءات الـ API
│  ├─ lib/                   # prisma, auth(jwt), api-helpers, api(axios)
│  ├─ i18n/                  # إعداد next-intl
│  ├─ config/nav.ts
│  ├─ types/
│  └─ middleware.ts          # حماية المسارات + توجيه اللغة
```

## 🧩 الوحدات (كلها مربوطة بقاعدة البيانات)

| الوحدة | الميزات |
|--------|---------|
| **لوحة التحكم** | 8 مؤشرات + رسم بياني (14 يوم) + دائرة توزيع + أحدث الرحلات |
| **الخريطة الحيّة** | تتبّع لحظي لمواقع السائقين المتصلين (Leaflet/OpenStreetMap، بلا مفتاح API) — تحديث كل 4 ثوانٍ مع حركة العلامات |
| **السائقون** | قائمة + بحث + ترقيم + موافقة/تعليق (mutation حقيقي) |
| **العملاء** | قائمة + بحث + تفعيل/تعطيل |
| **الرحلات** | قائمة + فلترة (ركّاب/توصيل) + حالات ملوّنة |
| **المتاجر** | قائمة المتاجر والمطاعم + الفئات والعمولات |
| **المالية** | معاملات + ملخّص الإيرادات والعمولات والمسحوبات |
| **طلبات السحب** | موافقة/رفض + خصم تلقائي من رصيد السائق + تسجيل معاملة |
| **الكوبونات** | عرض + **إنشاء** + حذف |
| **التقارير** | أعلى السائقين + الرحلات حسب المدينة + الإيراد حسب النوع |
| **الإعدادات** | عام + التسعير (حفظ فعلي في قاعدة البيانات) |
| **صفحات التفاصيل** | سائق / عميل / رحلة — اضغط الاسم أو رقم الرحلة لفتحها (ملف شخصي + إحصائيات + أحدث الرحلات + تفاصيل الأجرة والمسار) |

## 🌍 تبديل اللغة
زر اللغة (أعلى الشاشة) يبدّل بين عربي (RTL) وإنجليزي (LTR) فوراً مع تحديث الاتجاه والترجمات.

## 🗄️ قاعدة البيانات: Neon (PostgreSQL)
المشروع مضبوط على **Neon** (PostgreSQL serverless).
1. أنشئ مشروعاً على [neon.tech](https://neon.tech) وانسخ من **Connection Details**:
   - الرابط **Pooled** → `DATABASE_URL`
   - الرابط **Direct** → `DIRECT_URL`
   (مع `?sslmode=require` في الآخر)
2. ضعهما في `.env` (انسخ من `.env.example`).
3. `npm run db:push && npm run db:seed`.

> `.env` مُتجاهَل في git (يحتوي كلمة مرور القاعدة). الأسرار لا تُرفع.

## 📜 أوامر مفيدة
```bash
npm run dev          # تطوير
npm run build        # بناء إنتاجي (يتضمّن prisma generate)
npm run start        # تشغيل إنتاجي
npm run db:reset     # إعادة ضبط القاعدة + تعبئة
npx prisma studio    # واجهة لتصفّح قاعدة البيانات
```
