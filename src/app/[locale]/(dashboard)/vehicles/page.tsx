"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Wrench, CheckCircle2, AlertTriangle, Gauge, Check, Flag, X, ExternalLink, Image as ImageIcon } from "lucide-react";

import { getInspections, reviewInspection, type VehicleInspection } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatCard } from "@/components/stat-card";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";
import { SearchBar, Pagination, useDebounced } from "@/components/list-toolbar";
import { formatDateTime } from "@/lib/utils";

type Variant = "default" | "warning" | "destructive" | "secondary" | "success";
const STATUS_VARIANT: Record<string, Variant> = {
  submitted: "warning",
  approved: "success",
  flagged: "destructive",
  rejected: "secondary",
};

interface ChecklistEntry {
  key: string;
  label: string;
  ok: boolean;
  note?: string | null;
}

function parseJson<T>(s?: string | null, fallback: T = [] as any): T {
  if (!s) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
}

export default function VehiclesPage() {
  const t = useTranslations("vehicles");
  const qc = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "submitted" | "flagged" | "approved">("submitted");
  const debounced = useDebounced(search);
  const [selected, setSelected] = React.useState<VehicleInspection | null>(null);

  const status = filter === "all" ? "" : filter;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["inspections", page, debounced, filter],
    queryFn: () => getInspections({ page, search: debounced, status }),
  });

  const mut = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "flag" | "reject" }) => reviewInspection(id, action),
    onSuccess: () => {
      toast.success(t("saved"));
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["inspections"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const inspections = data?.inspections ?? [];

  function passRate(items: ChecklistEntry[]) {
    if (!items.length) return 0;
    return Math.round((items.filter((i) => i.ok).length / items.length) * 100);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder={t("searchPlaceholder")} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("submittedCount")} value={data?.submittedCount ?? 0} icon={Wrench} tone="warning" />
        <StatCard label={t("approvedCount")} value={data?.approvedCount ?? 0} icon={CheckCircle2} tone="success" />
        <StatCard label={t("flaggedCount")} value={data?.flaggedCount ?? 0} icon={AlertTriangle} tone="destructive" />
        <StatCard label={t("avgDamage")} value={`${data?.avgDamage ?? 0}/100`} icon={Gauge} tone="primary" />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "submitted", "flagged", "approved"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => { setFilter(f); setPage(1); }}
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
          ) : inspections.length === 0 ? (
            <EmptyState message={t("empty")} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("driver")}</TableHead>
                    <TableHead>{t("type")}</TableHead>
                    <TableHead>{t("odometer")}</TableHead>
                    <TableHead>{t("passRate")}</TableHead>
                    <TableHead>{t("damage")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("createdAt")}</TableHead>
                    <TableHead className="text-end">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.map((ins) => {
                    const items = parseJson<ChecklistEntry[]>(ins.items, []);
                    const pr = passRate(items);
                    return (
                      <TableRow key={ins.id}>
                        <TableCell>
                          {ins.driver ? (
                            <div>
                              <Link href={`/drivers/${ins.driver.id}`} className="font-medium hover:text-primary hover:underline">
                                {ins.driver.name}
                              </Link>
                              <div className="text-xs text-muted-foreground">
                                {[ins.driver.carMake, ins.driver.carModel].filter(Boolean).join(" ")}
                                {ins.driver.plateNumber && ` — ${ins.driver.plateNumber}`}
                              </div>
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {t(`type_${ins.type}` as any)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">{ins.odometerKm?.toLocaleString() ?? "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <div className="h-full" style={{ width: `${pr}%`, background: pr >= 80 ? "rgb(34,197,94)" : pr >= 50 ? "rgb(245,158,11)" : "rgb(220,38,38)" }} />
                            </div>
                            <span className="text-xs font-mono">{pr}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={ins.damageScore >= 60 ? "text-destructive font-medium" : ins.damageScore >= 30 ? "text-warning font-medium" : ""}>
                            {ins.damageScore}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[ins.status] || "secondary"}>
                            {t(`st_${ins.status}` as any)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDateTime(ins.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setSelected(ins)}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            {ins.status === "submitted" && (
                              <>
                                <Button size="sm" variant="success" onClick={() => mut.mutate({ id: ins.id, action: "approve" })}>
                                  <Check className="h-4 w-4" />
                                  {t("approve")}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => mut.mutate({ id: ins.id, action: "flag" })}>
                                  <Flag className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => mut.mutate({ id: ins.id, action: "reject" })}>
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

      {selected && (
        <Modal open onClose={() => setSelected(null)} title={t("details")} className="max-w-2xl">
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">{t("driver")}</div>
                <div className="font-medium">{selected.driver?.name || "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">{t("type")}</div>
                <div>{t(`type_${selected.type}` as any)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">{t("odometer")}</div>
                <div>{selected.odometerKm?.toLocaleString() ?? "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">{t("damage")}</div>
                <div>{selected.damageScore}/100</div>
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-semibold text-sm">{t("checklist")}</h4>
              <div className="space-y-1">
                {parseJson<ChecklistEntry[]>(selected.items, []).map((i) => (
                  <div key={i.key} className="flex items-center justify-between rounded border p-2 text-sm">
                    <span>{i.label}</span>
                    {i.ok ? (
                      <Badge variant="success" className="gap-1">
                        <Check className="h-3 w-3" />
                        {t("passed")}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <X className="h-3 w-3" />
                        {t("failed")}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-semibold text-sm flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                {t("photos")}
              </h4>
              {(() => {
                const photos = parseJson<string[]>(selected.photos, []);
                if (!photos.length) return <p className="text-xs text-muted-foreground">{t("noPhotos")}</p>;
                return (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={url} alt={`photo ${i + 1}`} className="aspect-square w-full rounded object-cover" />
                    ))}
                  </div>
                );
              })()}
            </div>

            {selected.notes && (
              <div>
                <h4 className="mb-1 font-semibold text-sm">{t("notes")}</h4>
                <p className="rounded border bg-muted/30 p-2 text-sm">{selected.notes}</p>
              </div>
            )}

            {selected.reviewerName && (
              <p className="text-xs text-muted-foreground">
                {t("reviewer")}: {selected.reviewerName} — {formatDateTime(selected.reviewedAt)}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
