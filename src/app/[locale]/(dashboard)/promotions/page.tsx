"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";

import { getPromos, createPromo, updatePromo, deletePromo } from "@/services";
import type { Promo } from "@/types";
import { getErrorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/status-badge";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";
import { Pagination } from "@/components/list-toolbar";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PromotionsPage() {
  const t = useTranslations("promotions");
  const qc = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Promo | null>(null);
  const EMPTY = { code: "", type: "percentage", value: "", maxDiscount: "", minOrder: "", usageLimit: "100", validToDays: "30", service: "all" };
  const [form, setForm] = React.useState(EMPTY);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["promos", page],
    queryFn: () => getPromos({ page }),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }
  function openEdit(p: Promo) {
    setEditing(p);
    setForm({
      code: p.code,
      type: p.type,
      value: String(p.value),
      maxDiscount: p.maxDiscount != null ? String(p.maxDiscount) : "",
      minOrder: String(p.minOrder ?? ""),
      usageLimit: String(p.usageLimit ?? "100"),
      validToDays: "30",
      service: p.service || "all",
    });
    setOpen(true);
  }

  const createMut = useMutation({
    mutationFn: () => {
      const body = {
        code: form.code,
        type: form.type,
        value: Number(form.value),
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        minOrder: Number(form.minOrder || 0),
        usageLimit: Number(form.usageLimit || 100),
        service: form.service,
      };
      return editing
        ? updatePromo(editing.id, body)
        : createPromo({ ...body, validToDays: Number(form.validToDays || 30) });
    },
    onSuccess: () => {
      toast.success(editing ? t("updated") : t("created"));
      setOpen(false);
      setEditing(null);
      setForm(EMPTY);
      qc.invalidateQueries({ queryKey: ["promos"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deletePromo(id),
    onSuccess: () => {
      toast.success(t("deleted"));
      qc.invalidateQueries({ queryKey: ["promos"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const promos = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t("create")}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-4">
          {isLoading ? (
            <TableSkeleton cols={9} />
          ) : isError ? (
            <ErrorState />
          ) : promos.length === 0 ? (
            <EmptyState message={t("empty")} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("code")}</TableHead>
                    <TableHead>{t("discount")}</TableHead>
                    <TableHead>{t("maxDiscount")}</TableHead>
                    <TableHead>{t("serviceLabel")}</TableHead>
                    <TableHead>{t("minOrder")}</TableHead>
                    <TableHead>{t("usage")}</TableHead>
                    <TableHead>{t("validTo")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell><Badge variant="outline" className="font-mono">{p.code}</Badge></TableCell>
                      <TableCell className="font-medium">
                        {p.type === "percentage" ? `${p.value}%` : formatCurrency(p.value)}
                      </TableCell>
                      <TableCell>{p.maxDiscount != null ? formatCurrency(p.maxDiscount) : "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{t(`service_${p.service || "all"}` as any)}</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(p.minOrder)}</TableCell>
                      <TableCell>{p.usedCount} / {p.usageLimit}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(p.validTo)}</TableCell>
                      <TableCell><StatusBadge status={p.status === "active" ? "active" : "inactive"} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => confirm({ message: t("deleteConfirm") }).then((ok) => ok && deleteMut.mutate(p.id))}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t("editTitle") : t("createTitle")}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate();
          }}
        >
          <div className="space-y-1">
            <Label>{t("code")}</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} dir="ltr" placeholder="WELCOME20" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("type")}</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="percentage">{t("percentage")}</option>
                <option value="fixed">{t("fixed")}</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>{t("value")}</Label>
              <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("maxDiscount")}</Label>
              <Input type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("serviceLabel")}</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.service}
                onChange={(e) => setForm({ ...form, service: e.target.value })}
              >
                <option value="all">{t("service_all")}</option>
                <option value="ride">{t("service_ride")}</option>
                <option value="delivery">{t("service_delivery")}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("minOrder")}</Label>
              <Input type="number" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} />
            </div>
            {!editing && (
              <div className="space-y-1">
                <Label>{t("validDays")}</Label>
                <Input type="number" value={form.validToDays} onChange={(e) => setForm({ ...form, validToDays: e.target.value })} />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button type="submit" disabled={createMut.isPending}>{t("save")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
