"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CircleSlash, Plus, Pencil, Trash, ToggleLeft, ToggleRight } from "lucide-react";

import {
  getCancellationReasons,
  createCancellationReason,
  updateCancellationReason,
  deleteCancellationReason,
  type CancellationReason,
} from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirm } from "@/components/ui/confirm";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";

export default function CancellationsPage() {
  const t = useTranslations("cancellations");
  const qc = useQueryClient();
  const [modal, setModal] = React.useState<{ open: boolean; editing?: CancellationReason }>({ open: false });
  const EMPTY = {
    key: "",
    labelAr: "",
    labelEn: "",
    audience: "both",
    sortOrder: 0,
    actionType: "auto_accept",
    refundPercent: 0,
    chargeFee: false,
    description: "",
  };
  const [form, setForm] = React.useState(EMPTY);

  const { data: reasons, isLoading, isError } = useQuery({
    queryKey: ["cancellation-reasons"],
    queryFn: getCancellationReasons,
  });

  function reset() {
    setForm(EMPTY);
  }
  function openCreate() {
    reset();
    setModal({ open: true });
  }
  function openEdit(r: CancellationReason) {
    const ra = r as any;
    setForm({
      key: r.key,
      labelAr: r.labelAr,
      labelEn: r.labelEn,
      audience: r.audience,
      sortOrder: r.sortOrder,
      actionType: ra.actionType ?? "auto_accept",
      refundPercent: ra.refundPercent ?? 0,
      chargeFee: ra.chargeFee ?? false,
      description: ra.description ?? "",
    });
    setModal({ open: true, editing: r });
  }

  const createMut = useMutation({
    mutationFn: () => createCancellationReason(form),
    onSuccess: () => {
      toast.success(t("saved"));
      setModal({ open: false });
      qc.invalidateQueries({ queryKey: ["cancellation-reasons"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateCancellationReason(id, data),
    onSuccess: () => {
      toast.success(t("saved"));
      setModal({ open: false });
      qc.invalidateQueries({ queryKey: ["cancellation-reasons"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteCancellationReason(id),
    onSuccess: () => {
      toast.success(t("deleted"));
      qc.invalidateQueries({ queryKey: ["cancellation-reasons"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function onSave() {
    if (modal.editing) {
      const { key, ...rest } = form;
      updateMut.mutate({ id: modal.editing.id, data: rest });
    } else {
      createMut.mutate();
    }
  }

  const rows = reasons ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CircleSlash className="h-6 w-6 text-primary" />
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t("add")}
        </Button>
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
          ) : rows.length === 0 ? (
            <EmptyState message={t("empty")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("sortOrder")}</TableHead>
                  <TableHead>{t("key")}</TableHead>
                  <TableHead>{t("label_ar")}</TableHead>
                  <TableHead>{t("label_en")}</TableHead>
                  <TableHead>{t("audience")}</TableHead>
                  <TableHead>{t("action")}</TableHead>
                  <TableHead>{t("policy")}</TableHead>
                  <TableHead>{t("active")}</TableHead>
                  <TableHead className="text-end">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs tabular-nums">{r.sortOrder}</TableCell>
                    <TableCell className="font-mono text-xs">{r.key}</TableCell>
                    <TableCell>{r.labelAr}</TableCell>
                    <TableCell dir="ltr">{r.labelEn}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t(`audience_${r.audience}` as any)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t(`action_${(r as any).actionType ?? "auto_accept"}` as any)}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t("refundPercent")}: {(r as any).refundPercent ?? 0}%
                      {(r as any).chargeFee ? ` · ${t("chargeFee")}` : ""}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateMut.mutate({ id: r.id, data: { active: !r.active } })}
                      >
                        {r.active ? <ToggleRight className="h-5 w-5 text-success" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                      </Button>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            confirm({ message: t("deleteConfirm"), variant: "danger" }).then((ok) => ok && deleteMut.mutate(r.id))
                          }
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal open={modal.open} onClose={() => setModal({ open: false })} title={modal.editing ? t("edit") : t("addTitle")}>
        <div className="space-y-3">
          <div>
            <Label htmlFor="key">{t("key")}</Label>
            <Input
              id="key"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              disabled={!!modal.editing}
              placeholder="late_driver"
              dir="ltr"
            />
          </div>
          <div>
            <Label htmlFor="labelAr">{t("label_ar")}</Label>
            <Input id="labelAr" value={form.labelAr} onChange={(e) => setForm({ ...form, labelAr: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="labelEn">{t("label_en")}</Label>
            <Input id="labelEn" value={form.labelEn} onChange={(e) => setForm({ ...form, labelEn: e.target.value })} dir="ltr" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="audience">{t("audience")}</Label>
              <select
                id="audience"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
              >
                <option value="both">{t("audience_both")}</option>
                <option value="driver">{t("audience_driver")}</option>
                <option value="customer">{t("audience_customer")}</option>
              </select>
            </div>
            <div>
              <Label htmlFor="sortOrder">{t("sortOrder")}</Label>
              <Input
                id="sortOrder"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="actionType">{t("actionType")}</Label>
              <select
                id="actionType"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={form.actionType}
                onChange={(e) => setForm({ ...form, actionType: e.target.value })}
              >
                <option value="auto_accept">{t("action_auto_accept")}</option>
                <option value="require_approval">{t("action_require_approval")}</option>
                <option value="escalate_support">{t("action_escalate_support")}</option>
              </select>
            </div>
            <div>
              <Label htmlFor="refundPercent">{t("refundPercent")}</Label>
              <Input
                id="refundPercent"
                type="number"
                min={0}
                max={100}
                value={form.refundPercent}
                onChange={(e) => setForm({ ...form, refundPercent: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.chargeFee}
              onChange={(e) => setForm({ ...form, chargeFee: e.target.checked })}
            />
            {t("chargeFee")}
          </label>
          <div>
            <Label htmlFor="description">{t("description")}</Label>
            <Input
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModal({ open: false })}>{t("cancel")}</Button>
            <Button onClick={onSave} disabled={createMut.isPending || updateMut.isPending}>
              {t("save")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
