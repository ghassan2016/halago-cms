"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Car, Package, X, Download, CalendarClock } from "lucide-react";

import { getTrips, cancelTrip } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { exportToCsv } from "@/lib/export-csv";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { StatusBadge } from "@/components/status-badge";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";
import { SearchBar, Pagination, useDebounced } from "@/components/list-toolbar";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export default function TripsPage() {
  const t = useTranslations("trips");
  const tc = useTranslations("common");
  const qc = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState("");
  const [scheduled, setScheduled] = React.useState(false);
  const debounced = useDebounced(search);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["trips", page, debounced, type, scheduled],
    queryFn: () => getTrips({ page, search: debounced, type, scheduled }),
  });

  const cancelMut = useMutation({
    mutationFn: (id: number) => cancelTrip(id),
    onSuccess: () => {
      toast.success(tc("tripCancelled"));
      qc.invalidateQueries({ queryKey: ["trips"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const trips = data?.data ?? [];
  const filters = [
    { value: "", label: t("all") },
    { value: "ride", label: t("ride") },
    { value: "delivery", label: t("delivery") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("title")}</h2>
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
                trips as any,
                [
                  { key: "number", label: t("number") },
                  { key: "type", label: t("type") },
                  { key: "status", label: t("status") },
                  { key: "fare", label: t("amount") },
                  { key: "pickupAddress", label: t("from") },
                  { key: "dropAddress", label: t("to") },
                ],
                "trips"
              )
            }
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={type === f.value ? "default" : "outline"}
            onClick={() => {
              setType(f.value);
              setPage(1);
            }}
          >
            {f.label}
          </Button>
        ))}
        <Button
          size="sm"
          variant={scheduled ? "default" : "outline"}
          onClick={() => {
            setScheduled((s) => !s);
            setPage(1);
          }}
        >
          <CalendarClock className="h-4 w-4" />
          {t("scheduledOnly")}
        </Button>
      </div>

      <Card>
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
                    <TableHead>{t("number")}</TableHead>
                    <TableHead>{t("type")}</TableHead>
                    <TableHead>{t("customer")}</TableHead>
                    <TableHead>{t("driver")}</TableHead>
                    <TableHead>{t("amount")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("scheduledAt")}</TableHead>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((trip) => (
                    <TableRow key={trip.id}>
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
                      <TableCell className="text-muted-foreground">{trip.driver?.name || "—"}</TableCell>
                      <TableCell>{formatCurrency(trip.fare)}</TableCell>
                      <TableCell><StatusBadge status={trip.status} /></TableCell>
                      <TableCell>
                        {trip.scheduledAt ? (
                          <Badge variant="secondary" className="gap-1 font-normal">
                            <CalendarClock className="h-3 w-3" />
                            {formatDateTime(trip.scheduledAt)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(trip.createdAt)}</TableCell>
                      <TableCell>
                        {!["completed", "cancelled"].includes(trip.status) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => confirm({ message: tc("tripCancelConfirm"), title: tc("cancelTrip") }).then((ok) => ok && cancelMut.mutate(trip.id))}
                          >
                            <X className="h-4 w-4" />
                            {tc("cancelTrip")}
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
    </div>
  );
}
