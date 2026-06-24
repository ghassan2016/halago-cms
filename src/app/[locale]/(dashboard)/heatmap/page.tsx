"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Flame, MapPin, TrendingUp } from "lucide-react";

import { getHeatmap } from "@/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/stat-card";
import { ErrorState, EmptyState } from "@/components/data-state";

// Leaflet لا يعمل على الـ SSR — نُحمّل الخريطة ديناميكياً
const HeatMap = dynamic(() => import("@/components/heat-map"), { ssr: false });

export default function HeatmapPage() {
  const t = useTranslations("heatmap");
  const [range, setRange] = React.useState<"day" | "week" | "month" | "all">("week");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["heatmap", range],
    queryFn: () => getHeatmap(range),
    refetchInterval: 30000,
  });

  const points = data?.points ?? [];
  const cities = data?.cities ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Flame className="h-6 w-6 text-destructive" />
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {(["day", "week", "month", "all"] as const).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "outline"}
              onClick={() => setRange(r)}
            >
              {t(`range${r.charAt(0).toUpperCase() + r.slice(1)}` as any)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={t("totalPickups")}
          value={data?.total ?? 0}
          icon={MapPin}
          tone="primary"
        />
        <StatCard
          label={t("topCity")}
          value={data?.topCity?.name || "—"}
          icon={TrendingUp}
          tone="warning"
          hint={data?.topCity ? `${data.topCity.count}` : undefined}
        />
        <StatCard
          label={t("hottest")}
          value={points.filter((p) => p.weight >= 0.7).length}
          icon={Flame}
          tone="destructive"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("title")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[480px] w-full overflow-hidden rounded-b-xl">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : isError ? (
                <ErrorState />
              ) : points.length === 0 ? (
                <EmptyState message={t("empty")} />
              ) : (
                <HeatMap points={points} />
              )}
            </div>
            {/* تدرّج الألوان كمفتاح */}
            <div className="flex items-center gap-3 border-t p-3 text-xs">
              <span className="text-muted-foreground">{t("legendLow")}</span>
              <div
                className="h-2 flex-1 rounded-full"
                style={{
                  background:
                    "linear-gradient(to right, rgb(59,130,246), rgb(250,204,21), rgb(220,38,38))",
                }}
              />
              <span className="text-muted-foreground">{t("legendHigh")}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("topZones")}</CardTitle>
          </CardHeader>
          <CardContent>
            {cities.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
            ) : (
              <ol className="space-y-2 text-sm">
                {cities.slice(0, 10).map((c, i) => {
                  const max = cities[0]?.count || 1;
                  const pct = Math.round((c.count / max) * 100);
                  return (
                    <li key={c.name} className="flex items-center gap-3">
                      <span className="w-5 text-end text-xs text-muted-foreground">{i + 1}</span>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-medium">{c.name}</span>
                          <span className="text-xs text-muted-foreground">{c.count}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-destructive"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
