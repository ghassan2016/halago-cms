"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, Check, Ban, Plus } from "lucide-react";

import { getDriversList, createDriver, updateDriver, bulkUpdateDrivers } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { exportToCsv } from "@/lib/export-csv";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BulkBar } from "@/components/bulk-bar";
import { confirm } from "@/components/ui/confirm";
import { StatusBadge } from "@/components/status-badge";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";
import { SearchBar, Pagination, useDebounced } from "@/components/list-toolbar";
import { formatDate, formatCurrency } from "@/lib/utils";

const TIER_VARIANT: Record<string, "secondary" | "outline" | "warning" | "default"> = {
  bronze: "secondary",
  silver: "outline",
  gold: "warning",
  platinum: "default",
};
const EMPTY_DRIVER = {
  name: "",
  phone: "",
  email: "",
  vehicleType: "",
  carMake: "",
  carModel: "",
  plateNumber: "",
  city: "",
};

export default function DriversPage() {
  const t = useTranslations("drivers");
  const tc = useTranslations("common");
  const tb = useTranslations("bulk");
  const qc = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("newest");
  const [lowRated, setLowRated] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_DRIVER);
  const debounced = useDebounced(search);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["drivers", page, debounced, sort, lowRated],
    queryFn: () => getDriversList({ page, search: debounced, sort: sort === "newest" ? undefined : sort, lowRated }),
  });

  const createMut = useMutation({
    mutationFn: () =>
      createDriver({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        vehicleType: form.vehicleType || undefined,
        carMake: form.carMake || undefined,
        carModel: form.carModel || undefined,
        plateNumber: form.plateNumber || undefined,
        city: form.city || undefined,
      }),
    onSuccess: () => {
      toast.success(t("created"));
      setOpen(false);
      setForm(EMPTY_DRIVER);
      qc.invalidateQueries({ queryKey: ["drivers"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const mutation = useMutation({
    mutationFn: ({ id, body, msg }: { id: number; body: Record<string, unknown>; msg: string }) =>
      updateDriver(id, body).then(() => msg),
    onSuccess: (msg) => {
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ["drivers"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const bulkMut = useMutation({
    mutationFn: ({ ids, action }: { ids: number[]; action: "approve" | "suspend" }) =>
      bulkUpdateDrivers(ids, action),
    onSuccess: (r) => {
      toast.success(r.failed > 0 ? tb("partial", { n: r.updated, failed: r.failed }) : tb("done", { n: r.updated }));
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["drivers"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const drivers = data?.data ?? [];
  const ids = drivers.map((d) => d.id);
  const allChecked = ids.length > 0 && ids.every((id) => selected.has(id));
  const someChecked = ids.some((id) => selected.has(id));

  function toggleAll(v: boolean) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (v) ids.forEach((id) => next.add(id));
      else ids.forEach((id) => next.delete(id));
      return next;
    });
  }
  function toggleOne(id: number, v: boolean) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (v) next.add(id);
      else next.delete(id);
      return next;
    });
  }
  async function onBulk(action: string) {
    if (action !== "approve" && action !== "suspend") return;
    const idsArr = Array.from(selected);
    const ok = await confirm({
      message: action === "approve"
        ? tb("confirmApprove", { count: idsArr.length })
        : tb("confirmSuspend", { count: idsArr.length }),
      variant: action === "suspend" ? "danger" : "default",
    });
    if (!ok) return;
    bulkMut.mutate({ ids: idsArr, action });
  }

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
          <select
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            title={t("sortLabel")}
          >
            <option value="newest">{t("sort_newest")}</option>
            <option value="rating">{t("sort_rating")}</option>
            <option value="rating_asc">{t("sort_rating_asc")}</option>
          </select>
          <Button
            variant={lowRated ? "default" : "outline"}
            onClick={() => { setLowRated((v) => !v); setPage(1); }}
          >
            <Star className="h-4 w-4" />
            {t("lowRated")}
          </Button>
          <Button
            variant="outline"
            size="icon"
            title={tc("export")}
            onClick={() =>
              exportToCsv(
                drivers as any,
                [
                  { key: "name", label: t("driver") },
                  { key: "phone", label: t("phone") },
                  { key: "status", label: t("status") },
                  { key: "rating", label: t("rating") },
                  { key: "walletBalance", label: t("wallet") },
                  { key: "city", label: "city" },
                ],
                "drivers"
              )
            }
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>

      <BulkBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        onAction={onBulk}
        pending={bulkMut.isPending}
        actions={[
          { key: "approve", label: tb("approve"), variant: "success" },
          { key: "suspend", label: tb("suspend"), variant: "destructive" },
        ]}
      />

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-4">
          {isLoading ? (
            <TableSkeleton cols={9} />
          ) : isError ? (
            <ErrorState />
          ) : drivers.length === 0 ? (
            <EmptyState message={t("empty")} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allChecked}
                        indeterminate={!allChecked && someChecked}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>{t("driver")}</TableHead>
                    <TableHead>{t("tier")}</TableHead>
                    <TableHead>{t("phone")}</TableHead>
                    <TableHead>{t("vehicle")}</TableHead>
                    <TableHead>{t("rating")}</TableHead>
                    <TableHead>{t("wallet")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("joinedAt")}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((d) => (
                    <TableRow key={d.id} data-selected={selected.has(d.id) || undefined}>
                      <TableCell>
                        <Checkbox checked={selected.has(d.id)} onCheckedChange={(v) => toggleOne(d.id, v)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={d.name} src={d.avatar} className="h-9 w-9" />
                          <div>
                            <Link href={`/drivers/${d.id}`} className="font-medium hover:text-primary hover:underline">
                              {d.name}
                            </Link>
                            <p className="text-xs text-muted-foreground" dir="ltr">{d.email || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const tier = (d as any).tier as string | undefined;
                          return tier ? (
                            <Badge variant={TIER_VARIANT[tier] ?? "secondary"}>{t(`tier_${tier}` as any)}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          );
                        })()}
                      </TableCell>
                      <TableCell dir="ltr" className="whitespace-nowrap text-start tabular-nums">{d.phone}</TableCell>
                      <TableCell>{[d.carMake, d.carModel].filter(Boolean).join(" ") || d.vehicleType}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                          {Number(d.rating).toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell>{formatCurrency(d.walletBalance)}</TableCell>
                      <TableCell>
                        {d.status === "approved" ? (
                          <StatusBadge status={d.available ? "active" : "closed"} />
                        ) : (
                          <StatusBadge status={d.status} />
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {d.status !== "approved" && (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => mutation.mutate({ id: d.id, body: { status: "approved" }, msg: t("approved") })}
                            >
                              <Check className="h-4 w-4" />
                              {t("approve")}
                            </Button>
                          )}
                          {d.status === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => mutation.mutate({ id: d.id, body: { status: "suspended" }, msg: t("suspended") })}
                            >
                              <Ban className="h-4 w-4" />
                              {t("suspend")}
                            </Button>
                          )}
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

      <Modal open={open} onClose={() => setOpen(false)} title={t("addTitle")}>
        <form
          className="space-y-3"
          onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("name")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>{t("phone")}</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" required />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t("email")}</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("vehicleType")}</Label>
              <Input value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("city")}</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>{t("carMake")}</Label>
              <Input value={form.carMake} onChange={(e) => setForm({ ...form, carMake: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("carModel")}</Label>
              <Input value={form.carModel} onChange={(e) => setForm({ ...form, carModel: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("plateNumber")}</Label>
              <Input value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} dir="ltr" />
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
