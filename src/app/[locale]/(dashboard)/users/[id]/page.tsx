"use client";

import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Star, Wallet, Route } from "lucide-react";

import { getCustomer } from "@/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
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
  const params = useParams();
  const id = params.id as string;

  const { data: c, isLoading } = useQuery({ queryKey: ["customer", id], queryFn: () => getCustomer(id) });

  if (isLoading || !c) {
    return <Skeleton className="h-96 rounded-xl" />;
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
