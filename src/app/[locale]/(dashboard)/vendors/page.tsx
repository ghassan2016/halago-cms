"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, Plus } from "lucide-react";

import { getVendors, createVendor } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";
import { SearchBar, Pagination, useDebounced } from "@/components/list-toolbar";
import { formatNumber } from "@/lib/utils";

const EMPTY_VENDOR = { name: "", category: "store", phone: "", address: "", commission: "15" };

export default function VendorsPage() {
  const t = useTranslations("vendors");
  const qc = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_VENDOR);
  const debounced = useDebounced(search);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["vendors", page, debounced],
    queryFn: () => getVendors({ page, search: debounced }),
  });

  const createMut = useMutation({
    mutationFn: () =>
      createVendor({
        name: form.name,
        category: form.category || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        commission: form.commission ? Number(form.commission) : undefined,
      }),
    onSuccess: () => {
      toast.success(t("created"));
      setOpen(false);
      setForm(EMPTY_VENDOR);
      qc.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const vendors = data?.data ?? [];
  const catLabel = (c: string) => {
    const keys: Record<string, string> = { restaurant: "restaurant", grocery: "grocery", pharmacy: "pharmacy", store: "store" };
    return keys[c] ? t(keys[c] as any) : c;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("add")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[220px] flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder={t("searchPlaceholder")} />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-4">
          {isLoading ? (
            <TableSkeleton cols={5} />
          ) : isError ? (
            <ErrorState />
          ) : vendors.length === 0 ? (
            <EmptyState message={t("empty")} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead>{t("category")}</TableHead>
                    <TableHead>{t("commission")}</TableHead>
                    <TableHead>{t("products")}</TableHead>
                    <TableHead>{t("rating")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={v.name} src={v.logo} className="h-9 w-9 rounded-lg" />
                          <div>
                            <Link href={`/vendors/${v.id}`} className="font-medium hover:text-primary hover:underline">
                              {v.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">{v.address || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{catLabel(v.category)}</TableCell>
                      <TableCell>{v.commission}%</TableCell>
                      <TableCell>{formatNumber(v._count?.products ?? 0)}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                          {Number(v.rating).toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell><StatusBadge status={v.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination meta={data?.meta ?? null} page={page} onPage={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={t("addTitle")}>
        <form
          className="space-y-3"
          onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }}
        >
          <div className="space-y-1">
            <Label>{t("name")}</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("category")}</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="restaurant">{t("restaurant")}</option>
                <option value="grocery">{t("grocery")}</option>
                <option value="pharmacy">{t("pharmacy")}</option>
                <option value="store">{t("store")}</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>{t("commission")}</Label>
              <Input type="number" value={form.commission} onChange={(e) => setForm({ ...form, commission: e.target.value })} dir="ltr" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t("phone")}</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label>{t("address")}</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
