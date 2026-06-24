"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Coins, TrendingUp, ArrowDownToLine, Wallet, Star, Download } from "lucide-react";

import { getEarnings } from "@/services";
import { Link } from "@/i18n/navigation";
import { exportToCsv } from "@/lib/export-csv";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";
import { SearchBar, useDebounced } from "@/components/list-toolbar";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function EarningsPage() {
  const t = useTranslations("earnings");
  const tc = useTranslations("common");
  const [range, setRange] = React.useState<"week" | "month" | "all">("month");
  const [search, setSearch] = React.useState("");
  const debounced = useDebounced(search);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["earnings", range, debounced],
    queryFn: () => getEarnings(range, debounced),
  });

  const rows = data?.rows ?? [];
  const top = data?.top ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Coins className="h-6 w-6 text-warning" />
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <SearchBar value={search} onChange={setSearch} placeholder={t("searchPlaceholder")} />
          <Button
            variant="outline"
            size="icon"
            title={tc("export")}
            onClick={() =>
              exportToCsv(
                rows as any,
                [
                  { key: "driverName", label: t("driver") },
                  { key: "completedTrips", label: t("completedTrips") },
                  { key: "gross", label: t("grossEarnings") },
                  { key: "commission", label: t("commission") },
                  { key: "net", label: t("netEarnings") },
                  { key: "payouts", label: t("totalPayouts") },
                  { key: "balance", label: t("balance") },
                ],
                `earnings-${range}`
              )
            }
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["week", "month", "all"] as const).map((r) => (
          <Button key={r} size="sm" variant={range === r ? "default" : "outline"} onClick={() => setRange(r)}>
            {t(`range${r.charAt(0).toUpperCase() + r.slice(1)}` as any)}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("totalEarnings")} value={formatCurrency(data?.totals?.totalEarnings ?? 0)} icon={Coins} tone="success" />
        <StatCard label={t("totalCommission")} value={formatCurrency(data?.totals?.totalCommission ?? 0)} icon={TrendingUp} tone="primary" />
        <StatCard label={t("totalPayouts")} value={formatCurrency(data?.totals?.totalPayouts ?? 0)} icon={ArrowDownToLine} tone="warning" />
        <StatCard label={t("avgEarnings")} value={formatCurrency(data?.totals?.avgEarnings ?? 0)} icon={Wallet} tone="primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("table")}</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {isLoading ? (
              <TableSkeleton cols={7} />
            ) : isError ? (
              <ErrorState />
            ) : rows.length === 0 ? (
              <EmptyState message={t("empty")} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("driver")}</TableHead>
                    <TableHead>{t("completedTrips")}</TableHead>
                    <TableHead>{t("grossEarnings")}</TableHead>
                    <TableHead>{t("commission")}</TableHead>
                    <TableHead>{t("netEarnings")}</TableHead>
                    <TableHead>{t("balance")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.driverId}>
                      <TableCell>
                        <Link href={`/drivers/${r.driverId}`} className="font-medium hover:text-primary hover:underline">
                          {r.driverName}
                        </Link>
                        <div className="text-xs text-muted-foreground">{r.city || ""}</div>
                      </TableCell>
                      <TableCell className="tabular-nums">{formatNumber(r.completedTrips)}</TableCell>
                      <TableCell>{formatCurrency(r.gross)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatCurrency(r.commission)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(r.net)}</TableCell>
                      <TableCell>{formatCurrency(r.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("topPerformers")}</CardTitle>
          </CardHeader>
          <CardContent>
            {top.length === 0 ? (
              <EmptyState message={t("empty")} />
            ) : (
              <ol className="space-y-3 text-sm">
                {top.map((r, i) => (
                  <li key={r.driverId} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                    <Avatar name={r.driverName} className="h-9 w-9" />
                    <div className="flex-1 min-w-0">
                      <Link href={`/drivers/${r.driverId}`} className="font-medium hover:underline">
                        {r.driverName}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-warning text-warning" />
                          {Number(r.rating).toFixed(1)}
                        </span>
                        <span>•</span>
                        <span>{r.completedTrips} {t("completedTrips")}</span>
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="font-semibold">{formatCurrency(r.net)}</div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
