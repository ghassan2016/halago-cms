"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, Wallet, Route } from "lucide-react";

import { getCustomer, adjustWallet } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/stat-card";
import { BackButton, InfoRow } from "@/components/detail-helpers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/data-state";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

export default function CustomerDetailPage() {
  const t = useTranslations("details");
  const tt = useTranslations("trips");
  const qc = useQueryClient();
  const params = useParams();
  const id = params.id as string;

  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");

  const { data: c, isLoading } = useQuery({ queryKey: ["customer", id], queryFn: () => getCustomer(id) });

  const walletMut = useMutation({
    mutationFn: (amt: number) => adjustWallet("customer", Number(id), amt, note),
    onSuccess: () => {
      toast.success(t("walletAdjusted"));
      setAmount("");
      setNote("");
      qc.invalidateQueries({ queryKey: ["customer", id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading || !c) {
    return <Skeleton className="h-96 rounded-xl" />;
  }

  function onAdjust(sign: 1 | -1) {
    const amt = Number(amount) * sign;
    if (!amt || Number.isNaN(amt)) return;
    walletMut.mutate(amt);
  }

  return (
    <div className="space-y-4">
      <BackButton />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
            <Avatar name={c.name} src={c.avatar} className="h-20 w-20 text-xl" />
            <div>
              <h2 className="text-lg font-bold">{c.name}</h2>
              <p className="text-sm text-muted-foreground" dir="ltr">{c.phone}</p>
            </div>
            <StatusBadge status={c.active ? "active" : "inactive"} />
            <div className="mt-2 w-full">
              <InfoRow label={t("email")} value={<span dir="ltr">{c.email || "—"}</span>} />
              <InfoRow label={t("city")} value={c.city} />
              <InfoRow label={t("joinedAt")} value={formatDate(c.createdAt)} />
            </div>

            {/* تعديل الرصيد (تعويض) */}
            <div className="mt-4 w-full space-y-2 border-t pt-4 text-start">
              <p className="text-sm font-medium">{t("walletAdjust")}</p>
              <p className="text-xs text-muted-foreground">{t("walletAdjustHint")}</p>
              <Input
                type="number"
                step="0.01"
                placeholder={t("amount")}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                dir="ltr"
              />
              <Input placeholder={t("note")} value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="success"
                  className="flex-1"
                  disabled={!amount || walletMut.isPending}
                  onClick={() => onAdjust(1)}
                >
                  {t("credit")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  disabled={!amount || walletMut.isPending}
                  onClick={() => onAdjust(-1)}
                >
                  {t("debit")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label={t("totalTrips")} value={formatNumber(c.totalTrips)} icon={Route} tone="primary" />
            <StatCard label={t("rating")} value={Number(c.rating).toFixed(1)} icon={Star} tone="warning" />
            <StatCard label={t("wallet")} value={formatCurrency(c.walletBalance)} icon={Wallet} tone="success" />
          </div>

          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base">{t("recentTrips")}</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pt-4">
              {!c.trips || c.trips.length === 0 ? (
                <EmptyState message={t("noTrips")} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tt("number")}</TableHead>
                      <TableHead>{tt("amount")}</TableHead>
                      <TableHead>{tt("status")}</TableHead>
                      <TableHead>{tt("date")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {c.trips.map((trip) => (
                      <TableRow key={trip.id}>
                        <TableCell className="font-medium">{trip.number}</TableCell>
                        <TableCell>{formatCurrency(trip.fare)}</TableCell>
                        <TableCell><StatusBadge status={trip.status} /></TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(trip.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
