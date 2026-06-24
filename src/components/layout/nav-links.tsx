"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { navForRole } from "@/config/nav";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const role = useAuthStore((s) => s.profile?.role);
  const items = navForRole(role);

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            <span>{t(item.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
