"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, CalendarDays, UserPlus, Car, Package, Calendar } from "lucide-react";

import { getScheduledTrips, getAvailableDrivers, reassignTrip } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";
import { SearchBar, Pagination, useDebounced } from "@/components/list-toolbar";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function ScheduledPage() {
  const t = useTranslations("scheduled");
  const td = useTranslations("dispatch");
  const qc = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [range, setRange] = React.useState<"all" | "today" | "week" | "unassigned">("all");
  const debounced = useDebounced(search);

  const [assignTripId, setAssignTripId] = React.useState<number | null>(null);
  const [selectedDriverId, setSelectedDriverId] = React.useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["scheduled", page, debounced, range],
    queryFn: () => getScheduledTrips({ page, search: debounced, range }),
  });

  const { data: available } = useQuery({
    queryKey: ["drivers-available"],
    queryFn: getAvailableDrivers,
    enabled: assignTripId !== null,
  });

  const assignMut = useMutation({
    mutationFn: ({ tripId, driverId }: { tripId: number; driverId: number }) => reassignTrip(tripId, driverId),
    onSuccess: () => {
      toast.success(t("assigned"));
      setAssignTripId(null);
      setSelectedDriverId(null);
      qc.invalidateQueries({ queryKey: ["scheduled"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const trips = data?.trips ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-primary" />
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder={t("searchPlaceholder")} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t("todayCount")} value={data?.todayCount ?? 0} icon={Calendar} tone="primary" />
        <StatCard label={t("weekCount")} value={data?.weekCount ?? 0} icon={CalendarDays} tone="success" />
        <StatCard label={t("unassignedCount")} value={data?.unassignedCount ?? 0} icon={UserPlus} tone="warning" />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "today", "week", "unassigned"] as const).map((r) => (
          <Button
            key={r}
            size="sm"
            variant={range === r ? "default" : "outline"}
            onClick={() => {
              setRange(r);
              setPage(1);
            }}
          >
            {t(`range${r.charAt(0).toUpperCase() + r.slice(1)}` as any)}
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
          ) : trips.length === 0 ? (
            <EmptyState message={t("empty")} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("scheduledAt")}</TableHead>
                    <TableHead>{t("number")}</TableHead>
                    <TableHead>{t("type")}</TableHead>
                    <TableHead>{t("customer")}</TableHead>
                    <TableHead>{t("from")}</TableHead>
                    <TableHead>{t("to")}</TableHead>
                    <TableHead>{t("driver")}</TableHead>
                    <TableHead>{t("estimate")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="text-end">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((trip) => (
                    <TableRow key={trip.id}>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1 font-normal">
                          <CalendarClock className="h-3 w-3" />
                          {trip.scheduledAt ? formatDateTime(trip.scheduledAt) : "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/trips/${trip.id}`} className="font-medium hover:text-primary hover:underline">
                          {trip.number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={trip.type === "ride" ? "default" : "warning"} className="gap-1">
                          {trip.type === "ride" ? <Car className="h-3 w-3" /> : <Package className="h-3 w-3" />}
                          {trip.type === "ride" ? t("ride") : t("delivery")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{trip.customer?.name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[160px] truncate" title={trip.pickupAddress ?? ""}>
                        {trip.pickupAddress || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[160px] truncate" title={trip.dropAddress ?? ""}>
                        {trip.dropAddress || "—"}
                      </TableCell>
                      <TableCell>
                        {trip.driver?.name ? (
                          <span>{trip.driver.name}</span>
                        ) : (
                          <span className="text-warning text-xs">{t("noDriver")}</span>
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(trip.fare)}</TableCell>
                      <TableCell><StatusBadge status={trip.status} /></TableCell>
                      <TableCell className="text-end">
                        {!trip.driverId && (
                          <Button size="sm" variant="outline" onClick={() => setAssignTripId(trip.id)}>
                            <UserPlus className="h-4 w-4" />
                            {t("assign")}
                          </Button>
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

      {assignTripId !== null && (
        <Modal open={assignTripId !== null} onClose={() => setAssignTripId(null)} title={td("reassignTitle")}>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{td("reassignHint")}</p>
            <Label htmlFor="driver">{td("reassignTitle")}</Label>
            <select
              id="driver"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={selectedDriverId ?? ""}
              onChange={(e) => setSelectedDriverId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">{td("selectDriver")}</option>
              {(available ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.available ? `(${td("online")})` : ""} — {d.vehicleType}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAssignTripId(null)}>
                {td("cancelBtn")}
              </Button>
              <Button
                disabled={!selectedDriverId || assignMut.isPending}
                onClick={() => selectedDriverId && assignMut.mutate({ tripId: assignTripId, driverId: selectedDriverId })}
              >
                {td("confirmReassign")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
