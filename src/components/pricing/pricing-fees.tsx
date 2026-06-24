"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Receipt } from "lucide-react";

import { getExtraFees, createExtraFee, updateExtraFee, deleteExtraFee } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/data-state";
import { formatCurrency, cn } from "@/lib/utils";

export function PricingFees() {
  const t = useTranslations("pricing");
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ key: "", name: "", amount: 0 });

  const { data, isLoading } = useQuery({ queryKey: ["extra-fees"], queryFn: getExtraFees });

  const createMut = useMutation({
    mutationFn: () => createExtraFee(form),
    onSuccess: () => {
      toast.success(t("feeCreated"));
      setOpen(false);
      setForm({ key: "", name: "", amount: 0 });
      qc.invalidateQueries({ queryKey: ["extra-fees"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => updateExtraFee(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["extra-fees"] }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => deleteExtraFee(id),
    onSuccess: () => {
      toast.success(t("feeDeleted"));
      qc.invalidateQueries({ queryKey: ["extra-fees"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const fees = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("addFee")}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4 text-primary" />
            {t("feesTab")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-4">
          {isLoading ? (
            <Skeleton className="mx-4 h-40" />
          ) : fees.length === 0 ? (
            <EmptyState message={t("noFees")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("feeName")}</TableHead>
                  <TableHead>{t("feeKey")}</TableHead>
                  <TableHead>{t("feeAmount")}</TableHead>
                  <TableHead>{t("active")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell dir="ltr" className="text-start font-mono text-xs text-muted-foreground">{f.key}</TableCell>
                    <TableCell>{formatCurrency(f.amount)}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => toggleMut.mutate({ id: f.id, active: !f.active })}
                        className={cn("rounded-full px-2 py-0.5 text-xs", f.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}
                      >
                        {f.active ? "✓" : "✕"}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => confirm({ message: t("feeDeleteConfirm") }).then((ok) => ok && delMut.mutate(f.id))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={t("addFeeTitle")}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("feeName")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>{t("feeKey")}</Label>
              <Input dir="ltr" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="airport" required />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>{t("feeAmount")}</Label>
              <Input type="number" step="0.5" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button type="submit" disabled={createMut.isPending}>{t("create")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
