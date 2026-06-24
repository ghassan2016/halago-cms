// In-memory sliding-window rate limiter.
// ⚠️ ملاحظة Vercel: الـ Map لا تتشارك بين Serverless instances، فالحدّ يُطبَّق لكل instance منفصل
// (يبقى مفيداً ضدّ هجوم single-IP لأن Vercel يميل لتثبيت IP→instance لمدّة قصيرة).
// لإنتاج multi-instance مُحكَم استبدله بـ Vercel KV / Upstash Redis (sliding window lua).

import { NextRequest, NextResponse } from "next/server";

interface Bucket {
  hits: number[]; // timestamps (ms)
}

const STORE = new Map<string, Bucket>();
const GC_INTERVAL = 60_000;
let lastGc = Date.now();

function gc(now: number, windowMs: number) {
  if (now - lastGc < GC_INTERVAL) return;
  lastGc = now;
  for (const [k, b] of Array.from(STORE.entries())) {
    b.hits = b.hits.filter((t) => now - t < windowMs);
    if (b.hits.length === 0) STORE.delete(k);
  }
}

function clientKey(req: NextRequest): string {
  // x-forwarded-for أكثر دقّة خلف proxy
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "anon";
}

interface LimitOptions {
  /** عدد الطلبات المسموح بها داخل النافذة */
  max: number;
  /** طول النافذة بالميلي ثانية */
  windowMs: number;
  /** بادئة للمفتاح (تميّز endpoint معيّن) */
  key: string;
}

/**
 * يحاسب الطلب الحالي. يرجع NextResponse 429 إن تجاوز الحدّ، وإلا null.
 * نمط الاستخدام داخل route handler:
 *
 *   const limited = checkRateLimit(req, { max: 5, windowMs: 60_000, key: "login" });
 *   if (limited) return limited;
 */
export function checkRateLimit(req: NextRequest, opts: LimitOptions): NextResponse | null {
  const now = Date.now();
  gc(now, opts.windowMs);
  const k = `${opts.key}:${clientKey(req)}`;
  const b = STORE.get(k) || { hits: [] };
  // إزالة الطلبات خارج النافذة
  b.hits = b.hits.filter((t) => now - t < opts.windowMs);
  if (b.hits.length >= opts.max) {
    const retryAfter = Math.ceil((opts.windowMs - (now - b.hits[0])) / 1000);
    STORE.set(k, b);
    return NextResponse.json(
      { success: false, message: `معدل الطلبات مرتفع — أعد المحاولة بعد ${retryAfter} ثانية` },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(opts.max),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }
  b.hits.push(now);
  STORE.set(k, b);
  return null;
}
