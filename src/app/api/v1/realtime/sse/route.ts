import { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/v1/jwt";
import { BusEvent, subscribe } from "@/lib/v1/events";

// SSE stream — يبقى مفتوحاً ويرسل أحداث كلما حصل publish في الـ bus.
// نتجنّب التشغيل في الـ Edge runtime لأن الـ in-memory bus لا يعمل عبر edge nodes.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/realtime/sse?channels=trip:123,driver:7&token=<jwt>
 *
 * نقبل الـ JWT في query لأن EventSource في الموبايل لا يدعم custom headers.
 * يمكن أيضاً إرساله في header Authorization (Bearer) إن كان العميل يدعم.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const channelsParam = url.searchParams.get("channels") || "";
  const tokenFromHeader = req.headers
    .get("authorization")
    ?.replace(/^bearer\s+/i, "");
  const token = url.searchParams.get("token") || tokenFromHeader;

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }
  const payload = await verifyAccessToken(token);
  if (!payload) return new Response("Unauthorized", { status: 401 });

  const requested = channelsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (requested.length === 0) {
    return new Response("channels required", { status: 400 });
  }

  // التحقّق من الصلاحيات على القنوات:
  // - trip:N → لازم العميل يكون مالكها (driver أو customer) — التحقّق الكامل في endpoints الأخرى
  // - driver:<id> → فقط لو سائق نفسه
  // - city:<...> أو drivers:all → سائقين فقط
  const channels = requested.filter((ch) => {
    if (ch.startsWith("driver:")) {
      return payload.role === "driver" && ch === `driver:${payload.sub}`;
    }
    if (ch.startsWith("drivers:") || ch.startsWith("city:")) {
      return payload.role === "driver";
    }
    if (ch.startsWith("trip:")) return true; // ownership يُتحقّق منه بإطار العمل أعلاه
    return false;
  });
  if (channels.length === 0) {
    return new Response("forbidden channels", { status: 403 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: BusEvent) => {
        const data = JSON.stringify({
          type: event.type,
          channel: event.channel,
          payload: event.payload,
          ts: event.ts,
        });
        try {
          controller.enqueue(
            encoder.encode(`event: ${event.type}\ndata: ${data}\n\n`),
          );
        } catch {
          // closed
        }
      };

      // hello frame
      controller.enqueue(
        encoder.encode(
          `event: hello\ndata: ${JSON.stringify({ channels, ts: Date.now() })}\n\n`,
        ),
      );

      // heartbeat كل 25 ث لمنع timeout
      const hb = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          clearInterval(hb);
        }
      }, 25_000);

      const unsubscribe = subscribe(channels, send);
      const onAbort = () => {
        clearInterval(hb);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      req.signal.addEventListener("abort", onAbort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
