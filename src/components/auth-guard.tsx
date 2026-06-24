"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { fetchMe } from "@/services";
import { useAuthStore, type Profile } from "@/lib/auth-store";

/**
 * يجلب الملف الشخصي من الخادم (الجلسة في كوكي httpOnly).
 * حماية المسار نفسها يتولاها middleware؛ هنا نملأ بيانات العرض فقط.
 *
 * إن فشل /api/auth/me بسبب جلسة قديمة (مثلاً بعد re-seed يخلّف admin id لا يطابق sub بالكوكي)،
 * نُعيد التوجيه لصفحة الدخول بدل البقاء عالقين بقائمة فارغة.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  // محجوز للاستخدام المستقبلي للترجمة في حالة عرض شاشة خطأ (حالياً نُعيد التوجيه مباشرة).
  useTranslations("common");
  const params = useParams<{ locale?: string }>();
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [loading, setLoading] = React.useState(!profile);

  React.useEffect(() => {
    let active = true;
    if (profile) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then((p) => active && setProfile(p as Profile))
      .catch(() => {
        // جلسة فاسدة/منتهية → امسح الكوكي وارجع للدخول
        if (!active || typeof window === "undefined") return;
        const locale = params?.locale === "en" ? "en" : "ar";
        // /api/auth/logout يمسح الكوكي على الخادم؛ ننتظره ثم نُعيد التوجيه.
        fetch("/api/auth/logout", { method: "POST", credentials: "include" })
          .catch(() => {})
          .finally(() => {
            if (!active) return;
            window.location.href = `/${locale}/login`;
          });
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [profile, setProfile, params]);

  if (loading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
