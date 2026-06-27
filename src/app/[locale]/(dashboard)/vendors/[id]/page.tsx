"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, Package, Route, Plus, Pencil, Trash2, Check, Snowflake, Lock } from "lucide-react";

import { getVendor, getVendorProducts, createProduct, updateProduct, deleteProduct, updateVendor, deleteVendor } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { confirm } from "@/components/ui/confirm";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/stat-card";
import { BackButton, InfoRow } from "@/components/detail-helpers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/data-state";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { Product } from "@/types";

const EMPTY_FORM = { id: 0, name: "", price: "", category: "", available: true };

export default function VendorDetailPage() {
  const t = useTranslations("vendors");
  const td = useTranslations("details");
  const tp = useTranslations("products");
  const qc = useQueryClient();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_FORM);

  const { data: v, isLoading } = useQuery({ queryKey: ["vendor", id], queryFn: () => getVendor(id) });
  const { data: products } = useQuery({ queryKey: ["vendor-products", id], queryFn: () => getVendorProducts(id) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["vendor-products", id] });
    qc.invalidateQueries({ queryKey: ["vendor", id] });
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name,
        price: Number(form.price),
        category: form.category || null,
        available: form.available,
      };
      return form.id ? updateProduct(form.id, body) : createProduct(id, body);
    },
    onSuccess: () => {
      toast.success(form.id ? tp("updated") : tp("created"));
      setOpen(false);
      setForm(EMPTY_FORM);
      refresh();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const toggleMut = useMutation({
    mutationFn: (p: Product) => updateProduct(p.id, { available: !p.available }),
    onSuccess: () => refresh(),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (pid: number) => deleteProduct(pid),
    onSuccess: () => { toast.success(tp("deleted")); refresh(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const statusMut = useMutation({
    mutationFn: (status: "open" | "frozen" | "closed") => updateVendor(id, { status }),
    onSuccess: () => { toast.success(t("statusUpdated")); qc.invalidateQueries({ queryKey: ["vendor", id] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteVendorMut = useMutation({
    mutationFn: () => deleteVendor(id),
    onSuccess: () => { toast.success(t("deleted")); router.push("/vendors"); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading || !v) return <Skeleton className="h-96 rounded-xl" />;

  const list = (products ?? []) as Product[];

  const openCreate = () => { setForm(EMPTY_FORM); setOpen(true); };
  const openEdit = (p: Product) => {
    setForm({ id: p.id, name: p.name, price: String(p.price), category: p.category || "", available: p.available });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <BackButton />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
            <Avatar name={v.name} src={v.logo} className="h-20 w-20 rounded-2xl text-xl" />
            <div>
              <h2 className="text-lg font-bold">{v.name}</h2>
              <p className="text-sm text-muted-foreground">{v.address || "—"}</p>
            </div>
            <StatusBadge status={v.status} />
            <div className="mt-2 w-full">
              <InfoRow label={t("category")} value={t(v.category as any)} />
              <InfoRow label={t("commission")} value={`${v.commission}%`} />
              <InfoRow label={td("phone")} value={<span dir="ltr">{v.phone || "—"}</span>} />
              <InfoRow label={td("joinedAt")} value={formatDate(v.createdAt)} />
            </div>

            {/* تغيير حالة المتجر */}
            <div className="mt-4 grid w-full grid-cols-3 gap-2 border-t pt-4">
              <Button
                size="sm"
                variant="success"
                disabled={v.status === "open" || statusMut.isPending}
                onClick={() => statusMut.mutate("open")}
              >
                <Check className="h-4 w-4" />
                {t("activate")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={v.status === "frozen" || statusMut.isPending}
                onClick={() => statusMut.mutate("frozen")}
              >
                <Snowflake className="h-4 w-4" />
                {t("freeze")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={v.status === "closed" || statusMut.isPending}
                onClick={() => statusMut.mutate("closed")}
              >
                <Lock className="h-4 w-4" />
                {t("close")}
              </Button>
            </div>
            <Button
              variant="destructive"
              className="mt-2 w-full"
              disabled={deleteVendorMut.isPending}
              onClick={() =>
                confirm({ message: t("deleteConfirm"), variant: "danger" }).then((ok) => ok && deleteVendorMut.mutate())
              }
            >
              <Trash2 className="h-4 w-4" />
              {t("delete")}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label={t("products")} value={formatNumber(list.length)} icon={Package} tone="primary" />
            <StatCard label={td("totalTrips")} value={formatNumber(v._count?.trips ?? 0)} icon={Route} tone="success" />
            <StatCard label={t("rating")} value={Number(v.rating).toFixed(1)} icon={Star} tone="warning" />
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between pb-0">
              <CardTitle className="text-base">{t("products")}</CardTitle>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                {tp("add")}
              </Button>
            </CardHeader>
            <CardContent className="px-0 pt-4">
              {list.length === 0 ? (
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
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? tp("editTitle") : tp("addTitle")}>
        <form
          className="space-y-3"
          onSubmit={(e) => { e.preventDefault(); saveMut.mutate(); }}
        >
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
            <input
              type="checkbox"
              checked={form.available}
              onChange={(e) => setForm({ ...form, available: e.target.checked })}
            />
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
