"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Star, Package, Route, Wallet } from "lucide-react";

import { getMyVendor } from "@/services";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/stat-card";
import { InfoRow } from "@/components/detail-helpers";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

export default function MyStorePage() {
  const t = useTranslations("vendors");
  const td = useTranslations("details");
  const tm = useTranslations("myStore");

  const { data: v, isLoading } = useQuery({ queryKey: ["my-vendor"], queryFn: getMyVendor });

  if (isLoading || !v) return <Skeleton className="h-80 rounded-xl" />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{tm("title")}</h2>
        <p className="text-sm text-muted-foreground">{tm("subtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
            <Avatar name={v.name} src={v.logo} className="h-20 w-20 rounded-2xl text-xl" />
            <div>
              <h3 className="text-lg font-bold">{v.name}</h3>
              <p className="text-sm text-muted-foreground">{v.address || "—"}</p>
            </div>
            <StatusBadge status={v.status} />
            <div className="mt-2 w-full">
              <InfoRow label={t("category")} value={t(v.category as any)} />
              <InfoRow label={t("commission")} value={`${v.commission}%`} />
              <InfoRow label={td("phone")} value={<span dir="ltr">{v.phone || "—"}</span>} />
              <InfoRow label={t("rating")} value={Number(v.rating).toFixed(1)} />
              <InfoRow label={td("joinedAt")} value={formatDate(v.createdAt)} />
            </div>
          </CardContent>
        </Card>

        <div className="grid content-start gap-4 sm:grid-cols-2 lg:col-span-2">
          <StatCard label={t("products")} value={formatNumber(v._stats?.products ?? 0)} icon={Package} tone="primary" />
          <StatCard label={tm("orders")} value={formatNumber(v._stats?.orders ?? 0)} icon={Route} tone="success" />
          <StatCard label={tm("revenue")} value={formatCurrency(v._stats?.revenue ?? 0)} icon={Wallet} tone="success" />
          <StatCard label={t("rating")} value={Number(v.rating).toFixed(1)} icon={Star} tone="warning" />
        </div>
      </div>
    </div>
  );
}
