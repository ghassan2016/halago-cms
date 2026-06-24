"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

import { getWithdrawals, updateWithdrawal, bulkUpdateWithdrawals } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkBar } from "@/components/bulk-bar";
import { confirm } from "@/components/ui/confirm";
import { StatusBadge } from "@/components/status-badge";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";
import { Pagination } from "@/components/list-toolbar";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function WithdrawalsPage() {
  const t = useTranslations("withdrawals");
  const tb = useTranslations("bulk");
  const qc = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());

  const { data, isLoading, isError } = useQuery({
    queryKey: ["withdrawals", page],
    queryFn: () => getWithdrawals({ page }),
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "approved" | "rejected" }) =>
      updateWithdrawal(id, status).then(() => status),
    onSuccess: (status) => {
      toast.success(status === "approved" ? t("approved") : t("rejected"));
      qc.invalidateQueries({ queryKey: ["withdrawals"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const bulkMut = useMutation({
    mutationFn: ({ ids, action }: { ids: number[]; action: "approve" | "reject" }) =>
      bulkUpdateWithdrawals(ids, action),
    onSuccess: (r) => {
      toast.success(r.failed > 0 ? tb("partial", { n: r.updated, failed: r.failed }) : tb("done", { n: r.updated }));
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["withdrawals"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const rows = data?.data ?? [];
  // العمليات الجماعية تنطبق فقط على الطلبات المعلّقة
  const pendingIds = rows.filter((r) => r.status === "pending").map((r) => r.id);
  const allChecked = pendingIds.length > 0 && pendingIds.every((id) => selected.has(id));
  const someChecked = pendingIds.some((id) => selected.has(id));

  function toggleAll(v: boolean) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (v) pendingIds.forEach((id) => next.add(id));
      else pendingIds.forEach((id) => next.delete(id));
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
    if (action !== "approve" && action !== "reject") return;
    const idsArr = Array.from(selected);
    const ok = await confirm({
      message: action === "approve"
        ? tb("confirmApprove", { count: idsArr.length })
        : tb("confirmReject", { count: idsArr.length }),
      variant: action === "reject" ? "danger" : "default",
    });
    if (!ok) return;
    bulkMut.mutate({ ids: idsArr, action });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <BulkBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        onAction={onBulk}
        pending={bulkMut.isPending}
        actions={[
          { key: "approve", label: tb("approve"), variant: "success" },
          { key: "reject", label: tb("reject"), variant: "destructive" },
        ]}
      />

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-4">
          {isLoading ? (
            <TableSkeleton cols={6} />
          ) : isError ? (
            <ErrorState />
          ) : rows.length === 0 ? (
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
                    <TableHead>{t("amount")}</TableHead>
                    <TableHead>{t("method")}</TableHead>
                    <TableHead>{t("balance")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((w) => (
                    <TableRow key={w.id} data-selected={selected.has(w.id) || undefined}>
                      <TableCell>
                        {w.status === "pending" ? (
                          <Checkbox checked={selected.has(w.id)} onCheckedChange={(v) => toggleOne(w.id, v)} />
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={w.driver?.name || "?"} className="h-9 w-9" />
                          <div>
                            <p className="font-medium">{w.driver?.name || "—"}</p>
                            <p className="text-xs text-muted-foreground" dir="ltr">{w.driver?.phone || ""}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(w.amount)}</TableCell>
                      <TableCell>{w.method === "bank" ? t("bank") : t("wallet")}</TableCell>
                      <TableCell className="text-muted-foreground">{formatCurrency(w.driver?.walletBalance)}</TableCell>
                      <TableCell><StatusBadge status={w.status} /></TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(w.createdAt)}</TableCell>
                      <TableCell>
                        {w.status === "pending" ? (
                          <div className="flex gap-1">
                            <Button size="sm" variant="success" onClick={() => mutation.mutate({ id: w.id, status: "approved" })}>
                              <Check className="h-4 w-4" />
                              {t("approve")}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => mutation.mutate({ id: w.id, status: "rejected" })}>
                              <X className="h-4 w-4" />
                              {t("reject")}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
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
