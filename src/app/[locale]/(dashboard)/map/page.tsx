"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { CircleDot } from "lucide-react";

import { getLiveDrivers } from "@/services";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// الخريطة تعتمد على window → تحميل ديناميكي بدون SSR
const LiveMap = dynamic(() => import("@/components/live-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

export default function MapPage() {
  const t = useTranslations("map");
  const { data, isLoading } = useQuery({
    queryKey: ["live-drivers"],
    queryFn: getLiveDrivers,
    refetchInterval: 4000, // تحديث كل 4 ثوانٍ
  });

  const drivers = data ?? [];

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Badge variant="success" className="gap-1.5 px-3 py-1.5 text-sm">
          <CircleDot className="h-3.5 w-3.5 animate-pulse" />
          {t("onlineNow", { count: drivers.length })}
        </Badge>
      </div>

      <Card className="flex-1 overflow-hidden">
        <CardContent className="h-full min-h-[500px] p-0">
          {isLoading ? (
            <Skeleton className="h-full min-h-[500px] w-full" />
          ) : (
            <div className="h-full min-h-[500px]">
              <LiveMap drivers={drivers} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
