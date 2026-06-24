"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Car, Package, ArrowDownToLine, Download } from "lucide-react";

import { getTransactions } from "@/services";
import { exportToCsv } from "@/lib/export-csv";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";
import { Pagination } from "@/components/list-toolbar";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function FinancePage() {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const [page, setPage] = React.useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["transactions", page],
    queryFn: () => getTransactions({ page }),
  });

  const totals = data?.totals ?? {};
  const transactions = data?.transactions ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportToCsv(
              transactions as any,
              [
                { key: "id", label: "#" },
                { key: "type", label: t("type") },
                { key: "actorType", label: t("actor") },
                { key: "amount", label: t("amount") },
                { key: "createdAt", label: t("date") },
              ],
              "transactions"
            )
          }
        >
          <Download className="h-4 w-4" />
          {tc("export")}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("totalRevenue")} value={formatCurrency(totals.commission)} icon={Wallet} tone="success" />
        <StatCard label={t("ridePayments")} value={formatCurrency(totals.ride_payment)} icon={Car} tone="primary" />
        <StatCard label={t("orderPayments")} value={formatCurrency(totals.order_payment)} icon={Package} tone="primary" />
        <StatCard label={t("payouts")} value={formatCurrency(totals.payout)} icon={ArrowDownToLine} tone="warning" />
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-4">
          {isLoading ? (
            <TableSkeleton cols={4} />
          ) : isError ? (
            <ErrorState />
          ) : transactions.length === 0 ? (
            <EmptyState message={t("empty")} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{t("type")}</TableHead>
                    <TableHead>{t("actor")}</TableHead>
                    <TableHead>{t("amount")}</TableHead>
                    <TableHead>{t("date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-muted-foreground">{tx.id}</TableCell>
                      <TableCell>
                        <Badge variant={tx.type === "commission" ? "success" : tx.type === "payout" ? "warning" : "secondary"}>
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{tx.actorType}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(tx.amount)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(tx.createdAt)}</TableCell>
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
