"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertOctagon, ShieldCheck, X, MapPin, ExternalLink, Phone } from "lucide-react";

import {
  getSosAlerts,
  ackSosAlert,
  resolveSosAlert,
  dismissSosAlert,
  type SosAlert,
} from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirm } from "@/components/ui/confirm";
import { StatCard } from "@/components/stat-card";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";
import { SearchBar, Pagination, useDebounced } from "@/components/list-toolbar";
import { formatDateTime } from "@/lib/utils";

type SeverityVariant = "default" | "warning" | "destructive" | "secondary";
const SEVERITY_VARIANT: Record<string, SeverityVariant> = {
  low: "secondary",
  medium: "default",
  high: "warning",
  critical: "destructive",
};
const STATUS_VARIANT: Record<string, SeverityVariant> = {
  open: "destructive",
  in_progress: "warning",
  resolved: "default",
  dismissed: "secondary",
};

export default function SosPage() {
  const t = useTranslations("sos");
  const qc = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "open" | "critical">("open");
  const debounced = useDebounced(search);
  const [selected, setSelected] = React.useState<SosAlert | null>(null);
  const [resolveOpen, setResolveOpen] = React.useState(false);
  const [resolution, setResolution] = React.useState("");

  const status = filter === "open" ? "open" : "";
  const severity = filter === "critical" ? "critical" : "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sos", page, debounced, filter],
    queryFn: () => getSosAlerts({ page, search: debounced, status, severity }),
    refetchInterval: 8000,
  });

  const ackMut = useMutation({
    mutationFn: (id: number) => ackSosAlert(id),
    onSuccess: () => {
      toast.success(t("saved"));
      qc.invalidateQueries({ queryKey: ["sos"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const dismissMut = useMutation({
    mutationFn: (id: number) => dismissSosAlert(id),
    onSuccess: () => {
      toast.success(t("saved"));
      qc.invalidateQueries({ queryKey: ["sos"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const resolveMut = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => resolveSosAlert(id, note),
    onSuccess: () => {
      toast.success(t("saved"));
      setResolveOpen(false);
      setSelected(null);
      setResolution("");
      qc.invalidateQueries({ queryKey: ["sos"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const alerts = data?.alerts ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <AlertOctagon className="h-6 w-6 text-destructive" />
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder={t("searchPlaceholder")} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label={t("openCount")}
          value={data?.openCount ?? 0}
          icon={AlertOctagon}
          tone="destructive"
        />
        <StatCard
          label={t("criticalCount")}
          value={data?.criticalCount ?? 0}
          icon={ShieldCheck}
          tone="warning"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "open", "critical"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
          >
            {t(`filter${f.charAt(0).toUpperCase() + f.slice(1)}` as any)}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-4">
          {isLoading ? (
            <TableSkeleton cols={7} />
          ) : isError ? (
            <ErrorState />
          ) : alerts.length === 0 ? (
            <EmptyState message={t("empty")} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("id")}</TableHead>
                    <TableHead>{t("reporter")}</TableHead>
                    <TableHead>{t("reason")}</TableHead>
                    <TableHead>{t("severity")}</TableHead>
                    <TableHead>{t("trip")}</TableHead>
                    <TableHead>{t("city")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("createdAt")}</TableHead>
                    <TableHead className="text-end">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((a) => (
                    <TableRow key={a.id} className={a.severity === "critical" && a.status !== "resolved" && a.status !== "dismissed" ? "bg-destructive/5" : ""}>
                      <TableCell className="font-mono text-xs">#{a.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{a.reporterName || t(`reporter_${a.reporterType}` as any)}</div>
                          {a.reporterPhone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground" dir="ltr">
                              <Phone className="h-3 w-3" />
                              {a.reporterPhone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{t(`reason_${a.reason}` as any)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={SEVERITY_VARIANT[a.severity] || "secondary"}>
                          {t(`severity_${a.severity}` as any)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {a.tripNumber ? (
                          <Link href={`/trips/${a.tripId}`} className="text-sm text-primary hover:underline" dir="ltr">
                            {a.tripNumber}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{a.city || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[a.status] || "secondary"}>
                          {t(`st_${a.status}` as any)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(a.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setSelected(a)}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          {a.status === "open" && (
                            <Button size="sm" variant="outline" onClick={() => ackMut.mutate(a.id)}>
                              {t("ack")}
                            </Button>
                          )}
                          {(a.status === "open" || a.status === "in_progress") && (
                            <>
                              <Button
                                size="sm"
                                variant="success"
                                onClick={() => {
                                  setSelected(a);
                                  setResolveOpen(true);
                                }}
                              >
                                {t("resolve")}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => confirm({ message: t("dismiss") + "?", variant: "danger" }).then((ok) => ok && dismissMut.mutate(a.id))}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
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

      {/* تفاصيل التنبيه */}
      {selected && !resolveOpen && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={t("details")}>
          <div className="space-y-3 text-sm">
            <Row label={t("id")} value={`#${selected.id}`} />
            <Row label={t("reporter")} value={selected.reporterName || t(`reporter_${selected.reporterType}` as any)} />
            {selected.reporterPhone && <Row label="Phone" value={selected.reporterPhone} dir="ltr" />}
            <Row label={t("reason")} value={t(`reason_${selected.reason}` as any)} />
            <Row label={t("severity")} value={<Badge variant={SEVERITY_VARIANT[selected.severity] || "secondary"}>{t(`severity_${selected.severity}` as any)}</Badge>} />
            <Row label={t("status")} value={<Badge variant={STATUS_VARIANT[selected.status] || "secondary"}>{t(`st_${selected.status}` as any)}</Badge>} />
            {selected.tripNumber && (
              <Row label={t("trip")} value={
                <Link href={`/trips/${selected.tripId}`} className="text-primary hover:underline" dir="ltr">{selected.tripNumber}</Link>
              } />
            )}
            {selected.city && <Row label={t("city")} value={selected.city} />}
            {selected.note && <Row label={t("note")} value={selected.note} />}
            {selected.handlerName && <Row label={t("handler")} value={selected.handlerName} />}
            {selected.resolution && <Row label={t("resolution")} value={selected.resolution} />}
            {selected.lat != null && selected.lng != null && (
              <a
                href={`https://www.openstreetmap.org/?mlat=${selected.lat}&mlon=${selected.lng}#map=16/${selected.lat}/${selected.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <MapPin className="h-4 w-4" />
                {t("viewMap")}
              </a>
            )}
          </div>
        </Modal>
      )}

      {/* نموذج كتابة ملخّص الحل */}
      {selected && resolveOpen && (
        <Modal
          open={resolveOpen}
          onClose={() => {
            setResolveOpen(false);
            setResolution("");
          }}
          title={t("resolve")}
        >
          <div className="space-y-3">
            <Label htmlFor="resolution">{t("resolution")}</Label>
            <textarea
              id="resolution"
              className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("resolutionPlaceholder")}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setResolveOpen(false);
                  setResolution("");
                }}
              >
                {t("dismiss")}
              </Button>
              <Button
                variant="success"
                disabled={!resolution.trim() || resolveMut.isPending}
                onClick={() => resolveMut.mutate({ id: selected.id, note: resolution.trim() })}
              >
                {t("resolve")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Row({ label, value, dir }: { label: string; value: React.ReactNode; dir?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-end" dir={dir}>{value}</span>
    </div>
  );
}
