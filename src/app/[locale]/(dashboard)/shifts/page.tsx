"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Timer, Activity, Clock, Coins } from "lucide-react";

import { getShifts } from "@/services";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";
import { SearchBar, Pagination, useDebounced } from "@/components/list-toolbar";
import { formatCurrency, formatDateTime } from "@/lib/utils";

function fmtDuration(t: any, mins: number) {
  if (!mins || mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hLbl = t("hours");
  const mLbl = t("minutes");
  if (h && m) return `${h} ${hLbl} ${m} ${mLbl}`;
  if (h) return `${h} ${hLbl}`;
  return `${m} ${mLbl}`;
}

export default function ShiftsPage() {
  const t = useTranslations("shifts");
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [range, setRange] = React.useState<"all" | "active" | "today">("all");
  const debounced = useDebounced(search);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["shifts", page, debounced, range],
    queryFn: () => getShifts({ page, search: debounced, range }),
    refetchInterval: 10000,
  });

  const shifts = data?.shifts ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Timer className="h-6 w-6 text-primary" />
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder={t("searchPlaceholder")} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("active")} value={data?.activeCount ?? 0} icon={Activity} tone="success" />
        <StatCard label={t("todayCount")} value={data?.todayCount ?? 0} icon={Timer} tone="primary" />
        <StatCard label={t("avgDuration")} value={fmtDuration(t, data?.avgDuration ?? 0)} icon={Clock} tone="warning" />
        <StatCard label={t("totalEarnings")} value={formatCurrency(data?.totalEarnings ?? 0)} icon={Coins} tone="success" />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "active", "today"] as const).map((r) => (
          <Button
            key={r}
            size="sm"
            variant={range === r ? "default" : "outline"}
            onClick={() => {
              setRange(r);
              setPage(1);
            }}
          >
            {t(`filter${r.charAt(0).toUpperCase() + r.slice(1)}` as any)}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-4">
          {isLoading ? (
            <TableSkeleton cols={8} />
          ) : isError ? (
            <ErrorState />
          ) : shifts.length === 0 ? (
            <EmptyState message={t("empty")} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("driver")}</TableHead>
                    <TableHead>{t("city")}</TableHead>
                    <TableHead>{t("startedAt")}</TableHead>
                    <TableHead>{t("endedAt")}</TableHead>
                    <TableHead>{t("duration")}</TableHead>
                    <TableHead>{t("trips")}</TableHead>
                    <TableHead>{t("earnings")}</TableHead>
                    <TableHead>{t("km")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        {s.driver ? (
                          <Link href={`/drivers/${s.driver.id}`} className="font-medium hover:text-primary hover:underline">
                            {s.driver.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{s.city || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(s.startedAt)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.endedAt ? formatDateTime(s.endedAt) : "—"}
                      </TableCell>
                      <TableCell>{fmtDuration(t, s.durationMin)}</TableCell>
                      <TableCell>
                        <span className="font-medium">{s.completedTrips}</span>
                        {s.cancelledTrips > 0 && (
                          <span className="text-xs text-destructive ms-1">({s.cancelledTrips}✗)</span>
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(s.totalEarnings)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {Number(s.totalKm).toFixed(1)} km
                      </TableCell>
                      <TableCell>
                        {s.status === "active" ? (
                          <Badge variant="success" className="gap-1">
                            <span className="inline-block h-2 w-2 rounded-full bg-current animate-pulse" />
                            {t("live")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{t("ended")}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination meta={data?.meta ?? null} page={page} onPage={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
