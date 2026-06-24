"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { getPromos, createPromo, deletePromo } from "@/services";
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
  const [form, setForm] = React.useState({ code: "", type: "percentage", value: "", minOrder: "", usageLimit: "100", validToDays: "30" });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["promos", page],
    queryFn: () => getPromos({ page }),
  });

  const createMut = useMutation({
    mutationFn: () =>
      createPromo({
        code: form.code,
        type: form.type,
        value: Number(form.value),
        minOrder: Number(form.minOrder || 0),
        usageLimit: Number(form.usageLimit || 100),
        validToDays: Number(form.validToDays || 30),
      }),
    onSuccess: () => {
      toast.success(t("created"));
      setOpen(false);
      setForm({ code: "", type: "percentage", value: "", minOrder: "", usageLimit: "100", validToDays: "30" });
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
        <Button onClick={() => setOpen(true)}>
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
            <TableSkeleton cols={6} />
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
                      <TableCell>{formatCurrency(p.minOrder)}</TableCell>
                      <TableCell>{p.usedCount} / {p.usageLimit}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(p.validTo)}</TableCell>
                      <TableCell><StatusBadge status={p.status === "active" ? "active" : "inactive"} /></TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => confirm({ message: t("deleteConfirm") }).then((ok) => ok && deleteMut.mutate(p.id))}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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

      <Modal open={open} onClose={() => setOpen(false)} title={t("createTitle")}>
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
              <Label>{t("minOrder")}</Label>
              <Input type="number" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("validDays")}</Label>
              <Input type="number" value={form.validToDays} onChange={(e) => setForm({ ...form, validToDays: e.target.value })} />
            </div>
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
