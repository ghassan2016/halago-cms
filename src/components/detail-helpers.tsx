"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function BackButton() {
  const t = useTranslations("details");
  const router = useRouter();
  return (
    <Button variant="ghost" size="sm" onClick={() => router.back()}>
      <ArrowRight className="h-4 w-4 rtl:rotate-180" />
      {t("back")}
    </Button>
  );
}

export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}
