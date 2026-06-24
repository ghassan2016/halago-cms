"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";

import { getMyOrders } from "@/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";
import { SearchBar, Pagination, useDebounced } from "@/components/list-toolbar";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function MyOrdersPage() {
  const t = useTranslations("trips");
  const tm = useTranslations("myOrders");
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const debounced = useDebounced(search);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-orders", page, debounced],
    queryFn: () => getMyOrders({ page, search: debounced }),
  });

  const orders = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{tm("title")}</h2>
          <p className="text-sm text-muted-foreground">{tm("subtitle")}</p>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder={t("searchPlaceholder")} />
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">{tm("title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-4">
          {isLoading ? (
            <TableSkeleton cols={5} />
          ) : isError ? (
            <ErrorState />
          ) : orders.length === 0 ? (
            <EmptyState message={tm("empty")} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("number")}</TableHead>
                    <TableHead>{t("customer")}</TableHead>
                    <TableHead>{t("driver")}</TableHead>
                    <TableHead>{t("amount")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.number}</TableCell>
                      <TableCell className="text-muted-foreground">{o.customer?.name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{o.driver?.name || "—"}</TableCell>
                      <TableCell>{formatCurrency(o.fare)}</TableCell>
                      <TableCell><StatusBadge status={o.status} /></TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(o.createdAt)}</TableCell>
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
