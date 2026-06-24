"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Car, Users, Route, Wallet, Clock, CircleDot, AlertOctagon, LifeBuoy, CalendarClock, Timer } from "lucide-react";
import { getDashboard } from "@/services";
import type { DashboardStats } from "@/types";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "@/i18n/navigation";
import { StatCard } from "@/components/stat-card";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["hsl(158 64% 39%)", "hsl(38 92% 50%)"];

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const role = useAuthStore((s) => s.profile?.role);
  const router = useRouter();

  // التاجر يُحوَّل لبوّابته الخاصة (لا يملك صلاحية لوحة الإدارة)
  React.useEffect(() => {
    if (role === "vendor") router.replace("/my-store");
  }, [role, router]);

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    enabled: role !== "vendor",
  });

  if (role === "vendor" || isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const pieData = (data.type_distribution || []).map((d) => ({
    name: d.name === "ride" ? t("rides") : t("deliveries"),
    value: d.value,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("totalUsers")} value={formatNumber(data.total_users)} icon={Users} tone="primary" />
        <StatCard label={t("totalDrivers")} value={formatNumber(data.total_drivers)} icon={Car} tone="success" />
        <StatCard label={t("totalTrips")} value={formatNumber(data.total_trips)} icon={Route} tone="primary" />
        <StatCard label={t("totalEarnings")} value={formatCurrency(data.total_earnings)} icon={Wallet} tone="success" />
        <StatCard label={t("onlineDrivers")} value={formatNumber(data.online_drivers)} icon={CircleDot} tone="success" />
        <StatCard label={t("pendingDrivers")} value={formatNumber(data.pending_drivers)} icon={Clock} tone="warning" />
        <StatCard label={t("todayTrips")} value={formatNumber(data.today_trips)} icon={Route} tone="primary" />
        <StatCard label={t("todayEarnings")} value={formatCurrency(data.today_earnings)} icon={Wallet} tone="success" />
      </div>

      {/* تنبيهات تشغيلية: مفاتيح اختصار للوحدات الحرجة (قابلة للنقر) */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{t("opsAlertsTitle")}</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/sos" className="block transition-transform hover:-translate-y-0.5">
            <StatCard label={t("opsSosOpen")} value={formatNumber(data.sos_open ?? 0)} icon={AlertOctagon} tone="destructive" />
          </Link>
          <Link href="/support" className="block transition-transform hover:-translate-y-0.5">
            <StatCard label={t("opsSupportUrgent")} value={formatNumber(data.support_urgent ?? 0)} icon={LifeBuoy} tone="warning" />
          </Link>
          <Link href="/scheduled" className="block transition-transform hover:-translate-y-0.5">
            <StatCard label={t("opsScheduledToday")} value={formatNumber(data.scheduled_today ?? 0)} icon={CalendarClock} tone="primary" />
          </Link>
          <Link href="/shifts" className="block transition-transform hover:-translate-y-0.5">
            <StatCard label={t("opsActiveShifts")} value={formatNumber(data.active_shifts ?? 0)} icon={Timer} tone="success" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("tripsChart")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.chart}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="trips" name={t("chartTrips")} stroke={COLORS[0]} fill="url(#g1)" />
                  <Area type="monotone" dataKey="earnings" name={t("chartEarnings")} stroke={COLORS[1]} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("typeDistribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("recentTrips")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.recent_trips?.map((trip) => (
            <Link
              key={trip.id}
              href={`/trips/${trip.id}`}
              className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{trip.number}</span>
                <StatusBadge status={trip.status} />
              </div>
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">{trip.customer?.name || "—"}</span>
                <span className="font-medium">{formatCurrency(trip.fare)}</span>
                <span className="hidden text-muted-foreground sm:inline">{formatDate(trip.createdAt)}</span>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
