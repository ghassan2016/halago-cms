"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { logout as apiLogout } from "@/services";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LangSwitcher } from "@/components/layout/lang-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

export function Topbar() {
  const t = useTranslations("auth");
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);

  async function handleLogout() {
    await apiLogout();
    setProfile(null);
    toast.success(t("logoutSuccess"));
    router.replace("/login");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav />
        <h1 className="truncate text-base font-semibold">
          {t("welcome", { name: profile?.name || "—" })}
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <LangSwitcher />
        <Link href="/account" className="hidden items-center gap-2 text-end hover:opacity-80 sm:flex">
          <div>
            <p className="text-sm font-medium">{profile?.name || "—"}</p>
            <p className="text-xs text-muted-foreground">{profile?.email || ""}</p>
          </div>
        </Link>
        <Link href="/account">
          <Avatar name={profile?.name || "A"} src={profile?.avatar} />
        </Link>
        <Button variant="ghost" size="icon" onClick={handleLogout} title={t("logout")}>
          <LogOut className="h-[18px] w-[18px]" />
        </Button>
      </div>
    </header>
  );
}
