"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldAlert, ShieldX, ShieldCheck, Play, ExternalLink, Check, X } from "lucide-react";

import {
  getFraudFlags,
  scanFraud,
  reviewFraud,
  confirmFraud,
  dismissFraud,
  type FraudFlag,
} from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/stat-card";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";
import { SearchBar, Pagination, useDebounced } from "@/components/list-toolbar";
import { formatDateTime } from "@/lib/utils";

type Variant = "default" | "warning" | "destructive" | "secondary" | "success";

const SEVERITY_VARIANT: Record<string, Variant> = {
  low: "secondary",
  medium: "warning",
  high: "destructive",
};

const STATUS_VARIANT: Record<string, Variant> = {
  open: "destructive",
  reviewing: "warning",
  confirmed: "destructive",
  dismissed: "secondary",
};

function detailHref(f: FraudFlag): string | null {
  if (f.subjectType === "driver") return `/drivers/${f.subjectId}`;
  if (f.subjectType === "customer") return `/users/${f.subjectId}`;
  if (f.subjectType === "trip") return `/trips/${f.subjectId}`;
  return null;
}

export default function FraudPage() {
  const t = useTranslations("fraud");
  const qc = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "open" | "high" | "confirmed">("open");
  const debounced = useDebounced(search);

  const [selected, setSelected] = React.useState<FraudFlag | null>(null);
  const [actionType, setActionType] = React.useState<"confirm" | "dismiss" | null>(null);
  const [note, setNote] = React.useState("");

  const status = filter === "open" ? "open" : filter === "confirmed" ? "confirmed" : "";
  const severity = filter === "high" ? "high" : "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["fraud", page, debounced, filter],
    queryFn: () => getFraudFlags({ page, search: debounced, status, severity }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["fraud"] });

  const scanMut = useMutation({
    mutationFn: scanFraud,
    onSuccess: (r) => {
      toast.success(t("scanDone", { created: r.created, scanned: r.scanned }));
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const reviewMut = useMutation({
    mutationFn: (id: number) => reviewFraud(id),
    onSuccess: invalidate,
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const confirmMut = useMutation({
    mutationFn: ({ id, n }: { id: number; n?: string }) => confirmFraud(id, n),
    onSuccess: () => {
      toast.success(t("savedConfirmed"));
      setActionType(null);
      setSelected(null);
      setNote("");
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const dismissMut = useMutation({
    mutationFn: ({ id, n }: { id: number; n?: string }) => dismissFraud(id, n),
    onSuccess: () => {
      toast.success(t("savedDismissed"));
      setActionType(null);
      setSelected(null);
      setNote("");
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const flags = data?.flags ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <SearchBar value={search} onChange={setSearch} placeholder={t("searchPlaceholder")} />
          <Button onClick={() => scanMut.mutate()} disabled={scanMut.isPending}>
            <Play className="h-4 w-4" />
            {scanMut.isPending ? t("scanning") : t("scan")}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t("openCount")} value={data?.openCount ?? 0} icon={ShieldAlert} tone="destructive" />
        <StatCard label={t("highCount")} value={data?.highCount ?? 0} icon={ShieldX} tone="warning" />
        <StatCard label={t("confirmedCount")} value={data?.confirmedCount ?? 0} icon={ShieldCheck} tone="success" />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "open", "high", "confirmed"] as const).map((f) => (
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
            <TableSkeleton cols={8} />
          ) : isError ? (
            <ErrorState />
          ) : flags.length === 0 ? (
            <EmptyState message={t("empty")} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("subject")}</TableHead>
                    <TableHead>{t("reason")}</TableHead>
                    <TableHead>{t("score")}</TableHead>
                    <TableHead>{t("severity")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("handler")}</TableHead>
                    <TableHead>{t("createdAt")}</TableHead>
                    <TableHead className="text-end">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flags.map((f) => {
                    const href = detailHref(f);
                    return (
                      <TableRow key={f.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {href ? (
                              <Link href={href} className="font-medium hover:text-primary hover:underline">
                                {f.subjectRef || `${f.subjectType} #${f.subjectId}`}
                              </Link>
                            ) : (
                              <span className="font-medium">{f.subjectRef || `${f.subjectType} #${f.subjectId}`}</span>
                            )}
                            <Badge variant="secondary" className="text-[10px] uppercase">
                              {t(`type_${f.subjectType}` as any)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{t(`reason_${f.reason}` as any)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${f.score}%`,
                                  background: f.score >= 75 ? "rgb(220,38,38)" : f.score >= 50 ? "rgb(245,158,11)" : "rgb(100,116,139)",
                                }}
                              />
                            </div>
                            <span className="text-xs font-mono">{f.score}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={SEVERITY_VARIANT[f.severity] || "secondary"}>
                            {t(`severity_${f.severity}` as any)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[f.status] || "secondary"}>
                            {t(`st_${f.status}` as any)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{f.handlerName || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDateTime(f.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setSelected(f)}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            {f.status === "open" && (
                              <Button size="sm" variant="outline" onClick={() => reviewMut.mutate(f.id)}>
                                {t("review")}
                              </Button>
                            )}
                            {(f.status === "open" || f.status === "reviewing") && (
                              <>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelected(f);
                                    setActionType("confirm");
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                  {t("confirm")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelected(f);
                                    setActionType("dismiss");
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Pagination meta={data?.meta ?? null} page={page} onPage={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      {/* تفاصيل العلامة */}
      {selected && !actionType && (
        <Modal open onClose={() => setSelected(null)} title={t("details")}>
          <div className="space-y-3 text-sm">
            <Row label={t("subject")} value={selected.subjectRef || `#${selected.subjectId}`} />
            <Row label={t("reason")} value={t(`reason_${selected.reason}` as any)} />
            <Row label={t("score")} value={`${selected.score} / 100`} />
            <Row label={t("severity")} value={<Badge variant={SEVERITY_VARIANT[selected.severity] || "secondary"}>{t(`severity_${selected.severity}` as any)}</Badge>} />
            <Row label={t("status")} value={<Badge variant={STATUS_VARIANT[selected.status] || "secondary"}>{t(`st_${selected.status}` as any)}</Badge>} />
            {selected.handlerName && <Row label={t("handler")} value={selected.handlerName} />}
            {selected.note && <Row label={t("note")} value={selected.note} />}
            <div>
              <div className="mb-1 text-muted-foreground">{t("evidence")}</div>
              <pre className="rounded-md border bg-muted/30 p-2 text-[11px] overflow-x-auto" dir="ltr">
                {selected.evidence ? JSON.stringify(JSON.parse(selected.evidence), null, 2) : "—"}
              </pre>
            </div>
          </div>
        </Modal>
      )}

      {/* مودال تأكيد/رفض مع ملاحظة */}
      {selected && actionType && (
        <Modal
          open
          onClose={() => {
            setActionType(null);
            setNote("");
          }}
          title={actionType === "confirm" ? t("confirmTitle") : t("dismissTitle")}
        >
          <div className="space-y-3">
            <Label htmlFor="note">{t("note")}</Label>
            <textarea
              id="note"
              className="min-h-[90px] w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("notePlaceholder")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setActionType(null);
                  setNote("");
                }}
              >
                {t("cancel")}
              </Button>
              <Button
                variant={actionType === "confirm" ? "destructive" : "default"}
                disabled={(actionType === "confirm" ? confirmMut.isPending : dismissMut.isPending)}
                onClick={() =>
                  actionType === "confirm"
                    ? confirmMut.mutate({ id: selected.id, n: note.trim() || undefined })
                    : dismissMut.mutate({ id: selected.id, n: note.trim() || undefined })
                }
              >
                {actionType === "confirm" ? t("confirm") : t("dismiss")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-end">{value}</span>
    </div>
  );
}
