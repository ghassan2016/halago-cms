# 🚀 نشر HalaGo CMS على Vercel

دليل خطوة-بخطوة لنشر المنصّة على Vercel مع قاعدة Neon Postgres.

---

## ✅ ما الذي جُهّز مسبقاً؟

| العنصر | الحالة |
|---|---|
| `prisma/schema.prisma` | `binaryTargets = ["native", "rhel-openssl-3.0.x"]` ✓ |
| `vercel.json` | إعدادات region + maxDuration لكل API ✓ |
| `package.json` | `build: prisma generate && next build` + `postinstall: prisma generate` ✓ |
| `.env.example` | كل المتغيّرات المطلوبة موثَّقة ✓ |
| `.gitignore` | يستثني `.env`, `.vercel`, `.next` ✓ |

---

## 1️⃣ المتطلّبات قبل النشر

- حساب Vercel: <https://vercel.com>
- حساب Neon (قاعدة البيانات): <https://neon.tech> — مجاني للبداية
- Git repository (GitHub/GitLab/Bitbucket)

---

## 2️⃣ تجهيز قاعدة Neon

1. أنشئ مشروعاً جديداً في Neon (يفضّل region قريب من Vercel — مثلاً `Frankfurt fra1`).
2. من **Connection Details** اختر:
   - **Pooled connection** → DATABASE_URL (يحتوي `-pooler` في الـ host)
   - **Direct connection** → DIRECT_URL (بدون `-pooler`)
3. تأكّد أن `?sslmode=require` في نهاية الرابطين.

```
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.fra1.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://user:pass@ep-xxx.fra1.aws.neon.tech/neondb?sslmode=require
```

---

## 3️⃣ النشر — الطريقة الأسهل (Vercel Dashboard)

### الخطوة A — رفع الكود
```bash
cd cms
git init
git add .
git commit -m "halago cms initial"
git remote add origin <YOUR_GIT_REPO_URL>
git push -u origin main
```

### الخطوة B — استيراد المشروع
1. ادخل على <https://vercel.com/new>
2. اختر الـ Git repo
3. عيّن **Root Directory** = `cms` (إن كان المشروع داخل مجلد فرعي)
4. لا تغيّر الـ Framework Preset (Vercel يكتشف Next.js تلقائياً)

### الخطوة C — متغيّرات البيئة
في صفحة الـ Import، أضف هذه (نسخ من `.env.example`):

| المفتاح | القيمة |
|---|---|
| `DATABASE_URL` | رابط Neon pooled |
| `DIRECT_URL` | رابط Neon direct |
| `JWT_SECRET` | نص عشوائي 48+ حرف (`openssl rand -base64 48`) |
| `NEXT_PUBLIC_APP_NAME` | `HalaGo CMS` (اختياري) |

### الخطوة D — Deploy
اضغط **Deploy** وانتظر 2-3 دقائق.

---

## 4️⃣ النشر — Vercel CLI (للمطوّرين)

```bash
# تثبيت الـ CLI مرّة واحدة
npm i -g vercel

# داخل مجلد cms/
vercel login
vercel link               # ربط المشروع بحساب Vercel
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add JWT_SECRET production
vercel --prod             # نشر إنتاجي
```

---

## 5️⃣ تطبيق Schema على قاعدة Neon

بعد أوّل نشر، شغّل **مرة واحدة** من جهازك المحلّي:

```bash
# تأكّد أن .env المحلّي يشير لنفس قاعدة Neon
npm run db:push           # ينشئ كل الجداول
npm run db:seed           # (اختياري) بيانات تجريبية
```

> 💡 لاحقاً عند تعديل `schema.prisma`، شغّل `npm run db:push` محلّياً قبل push للـ git.

---

## 6️⃣ اختبار النشر

افتح `https://<your-project>.vercel.app/ar/login` وسجّل دخول بـ:

```
admin@halago.com / password
```

تحقّق من:
- ✅ القائمة الجانبية تظهر بكامل الـ 30 وحدة
- ✅ الـ Dashboard يعرض إحصائيات حقيقية
- ✅ الخريطة الحيّة (`/ar/map`) تعمل
- ✅ الفاتورة (`/ar/trips/<id>/invoice`) تعرض ZATCA QR
- ✅ Live Dispatch (`/ar/dispatch`) يحدّث كل 5 ث

---

## 7️⃣ بعد النشر — أمان أساسي

### تغيير كلمة المرور
بعد أول دخول، اذهب إلى `/ar/account` وغيّر كلمة المرور فوراً.

### إنشاء مدراء حقيقيين
من `/ar/admins`، أضف الفريق بأدوارهم (operations / finance / support / super_admin)، ثم احذف الحساب التجريبي.

### إضافة الرقم الضريبي (للفواتير)
من `/ar/settings` → حقل **VAT Number**، أدخل رقمك الضريبي الحقيقي.

---

## ⚠️ ملاحظات Vercel-Specific

### Rate Limiting
الـ `lib/rate-limit.ts` يستخدم `Map` in-memory. Vercel Serverless ينشئ instances منفصلة، فالحدّ يُطبَّق **لكل instance**.
- ✅ يعمل بشكل معقول للحماية من single-IP brute force
- ⚠️ هاجم موزَّع IPs يحتاج طبقة إضافية (Vercel Firewall أو Cloudflare WAF)
- 🔧 للترقية الكاملة: استبدلها بـ **Vercel KV** أو **Upstash Redis** (sliding window lua script)

### Cold Starts
أوّل طلب لكل route ممكن يأخذ 2-3 ث (Prisma client init). الطلبات التالية سريعة (<200ms).

### Connection Pool
استخدمنا `DATABASE_URL` بـ pooled (`-pooler` host). تأكّد دائماً أن الـ `DIRECT_URL` يُستخدم فقط في migrations.

### Polling Endpoints
`/api/dispatch` (كل 5ث) و `/api/sos` (كل 8ث) و `/api/drivers/live` (كل 4ث) تستهلك Vercel Function Invocations. للمشاريع عالية الحركة فكّر بـ:
- SSE (Server-Sent Events) بدل polling
- Vercel KV pub/sub

### المنطقة (Region)
في `vercel.json` ضبطنا `regions: ["fra1"]` (Frankfurt — قريب من السعودية).
- ⚡ غيّرها إلى `iad1` (US East) إن كان الفريق في أمريكا
- ⚡ أو `cdg1` (Paris) للمنطقة الأوروبية
- ⚠️ تأكّد أنها قريبة من region قاعدة Neon لأقلّ latency

---

## 🆘 استكشاف الأخطاء الشائعة

### "Cannot find module '@prisma/client'"
شغّل: ```vercel env pull``` ثم ```npm install && npx prisma generate```

### "Connection refused" أو "ETIMEDOUT"
- تأكّد من `?sslmode=require` في الـ DATABASE_URL
- تأكّد أن IP الـ Vercel function مسموح في Neon (افتراضياً Neon يقبل من أي IP)

### Build فشل: "Prisma engine not found"
تأكّد أن `binaryTargets` في `schema.prisma` تحتوي `rhel-openssl-3.0.x`.

### الفونت (Cairo) بطيء في التحميل
هذا متوقّع في first build — Vercel يخزّن الـ font cache بعدها.

---

## 📞 الدعم
- وثائق Vercel + Prisma: <https://www.prisma.io/docs/guides/deployment/deploying-to-vercel>
- وثائق Neon + Vercel: <https://neon.tech/docs/guides/vercel>
