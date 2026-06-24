"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export interface BulkAction {
  key: string;
  label: string;
  variant?: ButtonProps["variant"];
  icon?: React.ReactNode;
  confirmMessage?: string;
}

interface BulkBarProps {
  count: number;
  onClear: () => void;
  onAction: (key: string) => void;
  actions: BulkAction[];
  pending?: boolean;
}

/**
 * شريط إجراءات يظهر أعلى الجدول عند تحديد عناصر — يختفي إن count=0.
 * يستدعى من صفحات القوائم التي تدعم العمليات الجماعية.
 */
export function BulkBar({ count, onClear, onAction, actions, pending }: BulkBarProps) {
  const t = useTranslations("bulk");
  if (count === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
      <div className="flex items-center gap-3">
        <Button size="icon" variant="ghost" onClick={onClear}>
          <X className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {t("selected", { count })}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button
            key={a.key}
            size="sm"
            variant={a.variant ?? "default"}
            disabled={pending}
            onClick={() => onAction(a.key)}
          >
            {a.icon}
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
