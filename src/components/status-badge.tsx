"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

type Variant = "default" | "secondary" | "destructive" | "success" | "warning" | "outline";

const MAP: Record<string, { variant: Variant; key: string }> = {
  // رحلات
  completed: { variant: "success", key: "completed" },
  cancelled: { variant: "destructive", key: "cancelled" },
  in_progress: { variant: "default", key: "inProgress" },
  pending: { variant: "warning", key: "pending" },
  accepted: { variant: "default", key: "inProgress" },
  arrived: { variant: "default", key: "inProgress" },
  // سائقون
  approved: { variant: "success", key: "active" },
  rejected: { variant: "destructive", key: "inactive" },
  suspended: { variant: "destructive", key: "inactive" },
  // متاجر (open=مفتوح إيجابي)؛ صفحات SOS/Support تصرف بدائلها الخاصة
  open: { variant: "success", key: "open" },
  closed: { variant: "secondary", key: "closed" },
  // SOS / تذاكر دعم
  resolved: { variant: "success", key: "resolved" },
  dismissed: { variant: "secondary", key: "dismissed" },
  waiting_user: { variant: "default", key: "waitingUser" },
  // عام
  active: { variant: "success", key: "active" },
  inactive: { variant: "destructive", key: "inactive" },
};

/** شارة حالة موحّدة ومترجمة */
export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("common");
  const cfg = MAP[status] || { variant: "secondary" as Variant, key: "" };
  const label = cfg.key ? t(cfg.key as any) : status;
  return <Badge variant={cfg.variant}>{label}</Badge>;
}
