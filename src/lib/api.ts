import axios, { AxiosError, type AxiosInstance } from "axios";

/**
 * عميل HTTP موحّد — ينادي الـ API الداخلي (Next.js route handlers) على نفس النطاق.
 * المصادقة عبر كوكي httpOnly تُرسل تلقائياً.
 */
export const api: AxiosInstance = axios.create({
  baseURL: "/api",
  headers: { Accept: "application/json", "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 30000,
});

// عند انتهاء الجلسة (401) → إعادة توجيه لصفحة الدخول مع الحفاظ على اللغة
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const seg = window.location.pathname.split("/").filter(Boolean);
      const locale = ["ar", "en"].includes(seg[0]) ? seg[0] : "ar";
      if (!window.location.pathname.includes("/login")) {
        window.location.href = `/${locale}/login`;
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  const err = error as AxiosError<any>;
  const data = err?.response?.data;
  if (data?.message) return data.message;
  if (err?.message) return err.message;
  return "حدث خطأ غير متوقع";
}

/** استخراج data من ردّ { success, data, meta } */
export function unwrap<T>(payload: any): T {
  if (payload && typeof payload === "object" && "data" in payload) return payload.data as T;
  return payload as T;
}
