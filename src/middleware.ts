import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { SESSION_COOKIE } from "@/lib/auth";

const intlMiddleware = createMiddleware(routing);

// المسارات العامة (لا تحتاج تسجيل دخول) — بدون بادئة اللغة
const PUBLIC_PATHS = ["/login"];

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client, Accept",
  "Access-Control-Max-Age": "86400",
};

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // واجهة الموبايل: اسمح بـ CORS (لاختبار تطبيق Flutter Web محلياً)
  if (pathname.startsWith("/api/v1")) {
    if (req.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    }
    const res = NextResponse.next();
    for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
    return res;
  }

  // تجاهل باقي الـ API والأصول (يُعالج الـ API auth بنفسه)
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  // إزالة بادئة اللغة لمعرفة المسار الفعلي
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  const hasLocale = routing.locales.includes(maybeLocale as any);
  const pathWithoutLocale = hasLocale ? "/" + segments.slice(1).join("/") : pathname;
  const locale = hasLocale ? maybeLocale : routing.defaultLocale;

  const isPublic = PUBLIC_PATHS.some((p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(p + "/"));
  const hasSession = !!req.cookies.get(SESSION_COOKIE)?.value;

  // حماية المسارات: غير مسجّل + مسار محمي → /login
  if (!isPublic && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  // مسجّل دخول ويحاول فتح /login → لوحة التحكم
  if (isPublic && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(req);
}

export const config = {
  // طبّق على كل المسارات عدا الـ API والأصول الثابتة
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/api/v1/:path*"],
};
