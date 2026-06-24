"use client";

import { useTranslations } from "next-intl";
import { Car } from "lucide-react";
import { NavLinks } from "@/components/layout/nav-links";

function Brand() {
  const tApp = useTranslations("app");
  const t = useTranslations("nav");
  return (
    <>
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Car className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">{tApp("name")}</p>
          <p className="text-xs text-muted-foreground">{tApp("subtitle")}</p>
        </div>
      </div>
    </>
  );
}

/** القائمة الجانبية للحاسوب */
export function Sidebar() {
  const t = useTranslations("nav");
  return (
    <aside className="hidden w-64 shrink-0 border-e bg-card md:flex md:flex-col">
      <Brand />
      <NavLinks />
      <div className="border-t p-4 text-center text-xs text-muted-foreground">{t("version")}</div>
    </aside>
  );
}

export { Brand };
