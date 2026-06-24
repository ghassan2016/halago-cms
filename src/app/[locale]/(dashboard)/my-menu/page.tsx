"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { getMyProducts, createMyProduct, updateMyProduct, deleteMyProduct } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";

const EMPTY = { id: 0, name: "", price: "", category: "", available: true };

export default function MyMenuPage() {
  const t = useTranslations("vendors");
  const td = useTranslations("details");
  const tp = useTranslations("products");
  const tm = useTranslations("myMenu");
  const qc = useQueryClient();

  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY);

  const { data, isLoading, isError } = useQuery({ queryKey: ["my-products"], queryFn: getMyProducts });
  const refresh = () => qc.invalidateQueries({ queryKey: ["my-products"] });

  const saveMut = useMutation({
    mutationFn: () => {
      const body = { name: form.name, price: Number(form.price), category: form.category || null, available: form.available };
      return form.id ? updateMyProduct(form.id, body) : createMyProduct(body);
    },
    onSuccess: () => { toast.success(form.id ? tp("updated") : tp("created")); setOpen(false); setForm(EMPTY); refresh(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const toggleMut = useMutation({
    mutationFn: (p: Product) => updateMyProduct(p.id, { available: !p.available }),
    onSuccess: () => refresh(),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteMyProduct(id),
    onSuccess: () => { toast.success(tp("deleted")); refresh(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const list = (data ?? []) as Product[];
  const openCreate = () => { setForm(EMPTY); setOpen(true); };
  const openEdit = (p: Product) => {
    setForm({ id: p.id, name: p.name, price: String(p.price), category: p.category || "", available: p.available });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{tm("title")}</h2>
          <p className="text-sm text-muted-foreground">{tm("subtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {tp("add")}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">{t("products")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-4">
          {isLoading ? (
            <TableSkeleton cols={5} />
          ) : isError ? (
            <ErrorState />
          ) : list.length === 0 ? (
            <EmptyState message={tp("empty")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("category")}</TableHead>
                  <TableHead>{td("fare")}</TableHead>
                  <TableHead>{tp("available")}</TableHead>
                  <TableHead className="text-end">{tp("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.category || "—"}</TableCell>
                    <TableCell>{formatCurrency(p.price)}</TableCell>
                    <TableCell>
                      <button onClick={() => toggleMut.mutate(p)} title={tp("toggle")}>
                        <Badge variant={p.available ? "success" : "secondary"} className="cursor-pointer">
                          {p.available ? tp("on") : tp("off")}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => confirm({ message: tp("deleteConfirm") }).then((ok) => ok && deleteMut.mutate(p.id))}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? tp("editTitle") : tp("addTitle")}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); saveMut.mutate(); }}>
          <div className="space-y-1">
            <Label>{t("name")}</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{td("fare")}</Label>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>{t("category")}</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} />
            {tp("availableLabel")}
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{tp("cancel")}</Button>
            <Button type="submit" disabled={saveMut.isPending}>{tp("save")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
