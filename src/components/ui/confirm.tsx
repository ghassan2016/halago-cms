"use client";

import * as React from "react";
import { create } from "zustand";
import { useTranslations } from "next-intl";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConfirmVariant = "danger" | "default";

export interface ConfirmOptions {
  /** نص الرسالة الأساسي */
  message: string;
  /** عنوان اختياري (افتراضي: «تأكيد العملية») */
  title?: string;
  /** نص زر التأكيد (افتراضي: «تأكيد») */
  confirmText?: string;
  /** نص زر الإلغاء (افتراضي: «إلغاء») */
  cancelText?: string;
  /** danger (أحمر، للحذف) أو default (أساسي) */
  variant?: ConfirmVariant;
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions | null;
  resolve: ((v: boolean) => void) | null;
  show: (o: ConfirmOptions) => Promise<boolean>;
  settle: (v: boolean) => void;
}

const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  options: null,
  resolve: null,
  show: (options) =>
    new Promise<boolean>((resolve) => {
      // إن وُجد طلب سابق معلّق، أغلقه برفض
      get().resolve?.(false);
      set({ open: true, options, resolve });
    }),
  settle: (v) => {
    get().resolve?.(v);
    set({ open: false, options: null, resolve: null });
  },
}));

/**
 * تأكيد أنيق بنمط SweetAlert — يُستدعى من أي مكان ويُعيد Promise<boolean>.
 * مثال: `if (await confirm({ message: t("deleteConfirm") })) { ... }`
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().show(options);
}

/** يُركّب مرة واحدة في الجذر (Providers) لعرض نافذة التأكيد */
export function ConfirmDialog() {
  const t = useTranslations("common");
  const { open, options, settle } = useConfirmStore();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") settle(false);
      else if (e.key === "Enter") settle(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, settle]);

  if (!open || !options) return null;

  const danger = (options.variant ?? "danger") === "danger";
  const Icon = danger ? AlertTriangle : HelpCircle;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 animate-in fade-in" onClick={() => settle(false)} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl duration-200 animate-in fade-in zoom-in-95">
        <div className="flex flex-col items-center text-center">
          <div
            className={cn(
              "mb-4 flex h-14 w-14 items-center justify-center rounded-full",
              danger ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            )}
          >
            <Icon className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold">{options.title ?? t("confirmTitle")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{options.message}</p>
        </div>
        <div className="mt-6 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => settle(false)}>
            {options.cancelText ?? t("cancel")}
          </Button>
          <Button
            variant={danger ? "destructive" : "default"}
            className="flex-1"
            autoFocus
            onClick={() => settle(true)}
          >
            {options.confirmText ?? t("confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
