"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox, AlertCircle } from "lucide-react";

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ message }: { message?: string }) {
  const t = useTranslations("common");
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
      <Inbox className="h-10 w-10" />
      <p className="text-sm">{message || t("error")}</p>
    </div>
  );
}

export function ErrorState() {
  const t = useTranslations("common");
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-destructive">
      <AlertCircle className="h-10 w-10" />
      <p className="text-sm">{t("error")}</p>
      <p className="text-xs text-muted-foreground">{t("errorHint")}</p>
    </div>
  );
}
