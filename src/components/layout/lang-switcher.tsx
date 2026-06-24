"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function LangSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const toggle = () => {
    const next = locale === "ar" ? "en" : "ar";
    router.replace(pathname, { locale: next });
  };

  return (
    <Button variant="outline" size="sm" onClick={toggle} title="Language / اللغة">
      <Languages className="h-4 w-4" />
      {locale === "ar" ? "EN" : "ع"}
    </Button>
  );
}
