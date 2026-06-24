"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronRight, ChevronLeft } from "lucide-react";
import type { PaginationMeta } from "@/types";

export function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input className="pe-9" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function Pagination({
  meta,
  page,
  onPage,
}: {
  meta: PaginationMeta | null;
  page: number;
  onPage: (p: number) => void;
}) {
  const t = useTranslations("common");
  if (!meta) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm">
      <span className="text-muted-foreground">
        {t("page")} {meta.current_page} {t("of")} {meta.last_page} — {t("total")} {meta.total}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          {t("previous")}
        </Button>
        <Button variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => onPage(page + 1)}>
          {t("next")}
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        </Button>
      </div>
    </div>
  );
}

export function useDebounced<T>(value: T, delay = 400): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const tt = setTimeout(() => setV(value), delay);
    return () => clearTimeout(tt);
  }, [value, delay]);
  return v;
}
