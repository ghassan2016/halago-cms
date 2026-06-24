"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, ShieldOff, ShieldX, Plus, Trash } from "lucide-react";

import { getBlocklist, createBlocklist, removeBlocklist } from "@/services";
import { getErrorMessage } from "@/lib/api";
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

export default function BlocklistPage() {
  const t = useTranslations("blocklist");
  const qc = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "active" | "expired">("active");
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ kind: "phone", value: "", reason: "", expiresAt: "" });
  const debounced = useDebounced(search);

  const status = filter === "all" ? "" : filter;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["blocklist", page, debounced, filter],
    queryFn: () => getBlocklist({ page, search: debounced, status }),
  });

  const createMut = useMutation({
    mutationFn: () =>
      createBlocklist({
        kind: form.kind,
        value: form.value.trim(),
        reason: form.reason.trim() || undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      }),
    onSuccess: () => {
      toast.success(t("saved"));
      setOpen(false);
      setForm({ kind: "phone", value: "", reason: "", expiresAt: "" });
      qc.invalidateQueries({ queryKey: ["blocklist"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const removeMut = useMutation({
    mutationFn: (id: number) => removeBlocklist(id),
    onSuccess: () => {
      toast.success(t("removed"));
      qc.invalidateQueries({ queryKey: ["blocklist"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const entries = data?.entries ?? [];
  const now = Date.now();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Ban className="h-6 w-6 text-destructive" />
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <SearchBar value={search} onChange={setSearch} placeholder={t("searchPlaceholder")} />
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("add")}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t("totalBlocked")} value={data?.totalBlocked ?? 0} icon={Ban} tone="primary" />
        <StatCard label={t("activeBlocks")} value={data?.activeBlocks ?? 0} icon={ShieldX} tone="destructive" />
        <StatCard label={t("expiredCount")} value={data?.expiredCount ?? 0} icon={ShieldOff} tone="warning" />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "active", "expired"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => { setFilter(f); setPage(1); }}>
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
          ) : entries.length === 0 ? (
            <EmptyState message={t("empty")} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("kind")}</TableHead>
                    <TableHead>{t("value")}</TableHead>
                    <TableHead>{t("reason")}</TableHead>
                    <TableHead>{t("blockedBy")}</TableHead>
                    <TableHead>{t("expires")}</TableHead>
                    <TableHead>{t("createdAt")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="text-end">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => {
                    const isExpired = e.expiresAt && new Date(e.expiresAt).getTime() < now;
                    return (
                      <TableRow key={e.id}>
                        <TableCell>
                          <Badge variant="secondary">{t(`kind_${e.kind}` as any)}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs" dir="ltr">{e.value}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[260px] truncate" title={e.reason ?? ""}>{e.reason || "—"}</TableCell>
                        <TableCell className="text-sm">{e.blockedByName || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{e.expiresAt ? formatDateTime(e.expiresAt) : "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</TableCell>
                        <TableCell>
                          {!e.active ? (
                            <Badge variant="secondary">—</Badge>
                          ) : isExpired ? (
                            <Badge variant="secondary">{t("filterExpired")}</Badge>
                          ) : (
                            <Badge variant="destructive">{t("filterActive")}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-end">
                          {e.active && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => confirm({ message: t("removeConfirm"), variant: "danger" }).then((ok) => ok && removeMut.mutate(e.id))}
                            >
                              <Trash className="h-4 w-4" />
                              {t("remove")}
                            </Button>
                          )}
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

      <Modal open={open} onClose={() => setOpen(false)} title={t("addTitle")}>
        <div className="space-y-3">
          <div>
            <Label htmlFor="kind">{t("kind")}</Label>
            <select
              id="kind"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })}
            >
              <option value="phone">{t("kind_phone")}</option>
              <option value="email">{t("kind_email")}</option>
              <option value="id_number">{t("kind_id_number")}</option>
              <option value="device_id">{t("kind_device_id")}</option>
            </select>
          </div>
          <div>
            <Label htmlFor="value">{t("value")}</Label>
            <Input
              id="value"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder={t("valuePlaceholder")}
              dir="ltr"
            />
          </div>
          <div>
            <Label htmlFor="reason">{t("reason")}</Label>
            <Input id="reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder={t("reasonPlaceholder")} />
          </div>
          <div>
            <Label htmlFor="expiresAt">{t("expires")}</Label>
            <Input id="expiresAt" type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            <p className="mt-1 text-xs text-muted-foreground">{t("expiresHint")}</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button onClick={() => createMut.mutate()} disabled={!form.value.trim() || createMut.isPending}>
              {t("save")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
