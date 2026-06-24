import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
});

export type Locale = (typeof routing.locales)[number];

/** اتجاه الكتابة حسب اللغة */
export function dirOf(locale: string): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
