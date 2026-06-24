"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getCustomers, updateCustomer } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";
import { SearchBar, Pagination, useDebounced } from "@/components/list-toolbar";
import { formatDate, formatNumber } from "@/lib/utils";

export default function UsersPage() {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const qc = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
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

  const users = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder={t("searchPlaceholder")} />
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
    </div>
  );
}
