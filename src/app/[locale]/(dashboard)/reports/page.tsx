"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Star, Trophy, CalendarRange, Route, Wallet, UserPlus, Percent } from "lucide-react";

import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { StatCard } from "@/components/stat-card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface ReportsData {
  range: { from: string | null; to: string | null };
  totals: {
    tripsTotal: number;
    completedTotal: number;
    cancellationRate: number;
    totalRevenue: number;
    totalFare: number;
    customers: number;
    newCustomers: number;
  };
  topDrivers: { id: number; name: string; totalTrips: number; rating: number; walletBalance: number; revenue: number }[];
  tripsByCity: { city: string; count: number }[];
  driversByCity: { city: string; count: number }[];
  revenueByType: { name: string; value: number }[];
}

async function getReports(from?: string, to?: string): Promise<ReportsData> {
  const res = await api.get("/reports", { params: { from: from || undefined, to: to || undefined } });
  return res.data?.data;
}

function isoToday(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const t = useTranslations("reports");
  const td = useTranslations("dashboard");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [applied, setApplied] = React.useState({ from: "", to: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["reports", applied.from, applied.to],
    queryFn: () => getReports(applied.from, applied.to),
  });

  function applyRange() {
    setApplied({ from, to });
  }
  function applyPreset(days: number) {
    const f = isoToday(-days);
    const t = isoToday(0);
    setFrom(f);
    setTo(t);
    setApplied({ from: f, to: t });
  }
  function clearRange() {
    setFrom("");
    setTo("");
    setApplied({ from: "", to: "" });
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const cityData = data.tripsByCity.slice(0, 8);
  const revData = data.revenueByType.map((r) => ({
    name: r.name === "ride" ? td("rides") : td("deliveries"),
    value: r.value,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* فلتر نطاق التاريخ */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarRange className="h-4 w-4" />
            {t("dateRange")}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => applyPreset(7)}>{t("preset7")}</Button>
            <Button size="sm" variant="outline" onClick={() => applyPreset(30)}>{t("preset30")}</Button>
            <Button size="sm" variant="outline" onClick={() => applyPreset(90)}>{t("preset90")}</Button>
            <Button size="sm" variant="outline" onClick={clearRange}>{t("presetAll")}</Button>
          </div>
          <div className="flex flex-1 flex-wrap items-end justify-end gap-2 min-w-0">
            <div>
              <Label htmlFor="from" className="text-xs">{t("from")}</Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label htmlFor="to" className="text-xs">{t("to")}</Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
            </div>
            <Button onClick={applyRange} disabled={!from && !to}>{t("apply")}</Button>
          </div>
        </CardContent>
      </Card>

      {/* إحصائيات النطاق */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("completedTrips")} value={formatNumber(data.totals.completedTotal)} icon={Route} tone="success" />
        <StatCard label={t("totalRevenue")} value={formatCurrency(data.totals.totalRevenue)} icon={Wallet} tone="primary" />
        <StatCard label={t("cancelRate")} value={`${data.totals.cancellationRate}%`} icon={Percent} tone={data.totals.cancellationRate > 15 ? "destructive" : "warning"} />
        <StatCard label={t("newCustomers")} value={formatNumber(data.totals.newCustomers)} icon={UserPlus} tone="primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-warning" />
              {t("topDrivers")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.topDrivers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("noData")}</p>
            ) : (
              data.topDrivers.slice(0, 8).map((d, i) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border p-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>
                    <Avatar name={d.name} className="h-8 w-8" />
                    <span className="truncate text-sm font-medium">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm shrink-0">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                      {Number(d.rating).toFixed(1)}
                    </span>
                    <span className="text-muted-foreground">{formatNumber(d.totalTrips)}</span>
                    <span className="font-medium">{formatCurrency(d.revenue)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("revenueByType")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="value" fill="hsl(158 64% 39%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("tripsByCity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cityData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="city" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(38 92% 50%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
