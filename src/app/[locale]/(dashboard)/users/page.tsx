"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Plus } from "lucide-react";

import { getCustomers, createCustomer, updateCustomer } from "@/services";
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
import { formatDate, formatNumber } from "@/lib/utils";

const EMPTY_CUSTOMER = { name: "", phone: "", email: "", city: "" };

export default function UsersPage() {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const qc = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_CUSTOMER);
  const debounced = useDebounced(search);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["customers", page, debounced],
    queryFn: () => getCustomers({ page, search: debounced }),
  });

  const mutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => updateCustomer(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const createMut = useMutation({
    mutationFn: () =>
      createCustomer({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        city: form.city || undefined,
      }),
    onSuccess: () => {
      toast.success(t("created"));
      setOpen(false);
      setForm(EMPTY_CUSTOMER);
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const users = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("title")}</h2>
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

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-4">
          {isLoading ? (
            <TableSkeleton cols={6} />
          ) : isError ? (
            <ErrorState />
          ) : users.length === 0 ? (
            <EmptyState message={t("empty")} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("customer")}</TableHead>
                    <TableHead>{t("phone")}</TableHead>
                    <TableHead>{t("city")}</TableHead>
                    <TableHead>{t("trips")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("joinedAt")}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} src={u.avatar} className="h-9 w-9" />
                          <div>
                            <Link href={`/users/${u.id}`} className="font-medium hover:text-primary hover:underline">
                              {u.name}
                            </Link>
                            <p className="text-xs text-muted-foreground" dir="ltr">{u.email || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell dir="ltr" className="text-start">{u.phone}</TableCell>
                      <TableCell>{u.city || "—"}</TableCell>
                      <TableCell>{formatNumber(u.totalTrips)}</TableCell>
                      <TableCell>
                        <StatusBadge status={u.active ? "active" : "inactive"} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => mutation.mutate({ id: u.id, active: !u.active })}
                          >
                            {u.active ? tc("inactive") : tc("active")}
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

      <Modal open={open} onClose={() => setOpen(false)} title={t("addTitle")}>
        <form
          className="space-y-3"
          onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }}
        >
          <div className="space-y-1">
            <Label>{t("customer")}</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("phone")}</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" required />
            </div>
            <div className="space-y-1">
              <Label>{t("city")}</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t("email")}</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" />
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
