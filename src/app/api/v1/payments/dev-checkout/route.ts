import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/v1/payments/dev-checkout?ref=HG-PAY-...
 * صفحة HTML بسيطة في dev mode — تعرض زرّ "تأكيد الدفع" لمحاكاة Moyasar
 *
 * POST /api/v1/payments/dev-checkout?ref=...&action=succeed|fail
 * يحدّث الـ PaymentIntent + يضيف للرصيد
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const ref = url.searchParams.get("ref") || "";
  const intent = await prisma.paymentIntent.findUnique({
    where: { reference: ref },
  });

  if (!intent) {
    return new Response("Payment not found", { status: 404 });
  }

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <title>دفع تجريبي — HalaGo</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", "Cairo", sans-serif; background: #FAFAFA; margin: 0; padding: 24px; color: #0F172A; }
    .card { max-width: 420px; margin: 32px auto; background: white; border-radius: 20px; padding: 28px; box-shadow: 0 12px 32px rgba(0,0,0,0.08); }
    h1 { font-size: 18px; margin: 0 0 6px; }
    .sub { color: #64748B; font-size: 13px; margin: 0 0 20px; }
    .amount { font-size: 32px; font-weight: 800; color: #047857; text-align: center; padding: 16px; background: #F0FDF4; border-radius: 14px; margin: 16px 0 24px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; border-bottom: 1px solid #E2E8F0; }
    .row:last-child { border: none; }
    .row .k { color: #64748B; }
    .btn { width: 100%; padding: 14px; border-radius: 12px; font-size: 16px; font-weight: 800; border: none; cursor: pointer; margin-top: 8px; transition: 0.2s; }
    .btn-succeed { background: #10b981; color: white; }
    .btn-fail { background: #fff; color: #EF4444; border: 1px solid #EF4444; }
    .btn:hover { transform: translateY(-1px); }
    .badge { display: inline-block; background: #FEF3C7; color: #92400E; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; }
    .status { text-align: center; padding: 16px; border-radius: 10px; margin-top: 16px; font-weight: 700; display: none; }
    .status.ok { background: #DCFCE7; color: #15803D; display: block; }
    .status.no { background: #FEE2E2; color: #B91C1C; display: block; }
  </style>
</head>
<body>
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h1>دفع تجريبي</h1>
      <span class="badge">DEV MODE</span>
    </div>
    <p class="sub">هذي صفحة محاكاة Moyasar للاختبار المحلي. في الإنتاج: صفحة Moyasar الفعلية.</p>
    <div class="amount">${intent.amount.toFixed(2)} ر.س</div>
    <div class="row"><span class="k">المرجع</span><span>${intent.reference}</span></div>
    <div class="row"><span class="k">الغاية</span><span>شحن محفظة</span></div>
    <div class="row"><span class="k">الحالة</span><span>${intent.status}</span></div>

    <button class="btn btn-succeed" onclick="act('succeed')">تأكيد الدفع</button>
    <button class="btn btn-fail" onclick="act('fail')">رفض / فشل</button>
    <div id="status" class="status"></div>
  </div>
  <script>
    async function act(action) {
      const r = await fetch('/api/v1/payments/dev-checkout?ref=${encodeURIComponent(ref)}&action=' + action, { method: 'POST' });
      const j = await r.json().catch(() => ({}));
      const s = document.getElementById('status');
      if (r.ok) {
        s.className = 'status ok';
        s.textContent = action === 'succeed' ? '✅ تمّ الدفع — يمكنك إغلاق هذه الصفحة' : '⚠️ تمّ تسجيل الفشل';
        setTimeout(() => { window.close(); window.location.href = 'halago://wallet'; }, 1500);
      } else {
        s.className = 'status no';
        s.textContent = j.message || 'خطأ';
      }
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const ref = url.searchParams.get("ref") || "";
  const action = url.searchParams.get("action");

  const intent = await prisma.paymentIntent.findUnique({
    where: { reference: ref },
  });
  if (!intent) return new Response(JSON.stringify({ message: "not found" }), { status: 404 });
  if (intent.status !== "pending") {
    return new Response(JSON.stringify({ message: "تمّت المعالجة سابقاً" }), { status: 400 });
  }

  if (action === "succeed") {
    await prisma.$transaction(async (tx) => {
      await tx.paymentIntent.update({
        where: { reference: ref },
        data: { status: "succeeded" },
      });
      if (intent.purpose === "wallet_topup") {
        await tx.customer.update({
          where: { id: intent.ownerId },
          data: { walletBalance: { increment: intent.amount } },
        });
        await tx.transaction.create({
          data: {
            type: "topup",
            amount: intent.amount,
            actorType: "customer",
            actorId: intent.ownerId,
            status: "success",
          },
        });
      }
    });
    return Response.json({ ok: true });
  } else {
    await prisma.paymentIntent.update({
      where: { reference: ref },
      data: { status: "failed" },
    });
    return Response.json({ ok: true });
  }
}
