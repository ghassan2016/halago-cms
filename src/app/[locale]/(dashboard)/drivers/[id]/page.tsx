"use client";

import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, Car, Wallet, Route, FileText, Check, X, Clock } from "lucide-react";

import { getDriver, reviewDriverDocument } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/stat-card";
import { BackButton, InfoRow } from "@/components/detail-helpers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/data-state";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { DriverDocument } from "@/types";

export default function DriverDetailPage() {
  const t = useTranslations("details");
  const tt = useTranslations("trips");
  const tk = useTranslations("kyc");
  const qc = useQueryClient();
  const params = useParams();
  const id = params.id as string;

  const { data: d, isLoading } = useQuery({ queryKey: ["driver", id], queryFn: () => getDriver(id) });

  const docMut = useMutation({
    mutationFn: ({ docId, status }: { docId: number; status: "approved" | "rejected" }) =>
      reviewDriverDocument(docId, status),
    onSuccess: () => {
      toast.success(tk("reviewed"));
      qc.invalidateQueries({ queryKey: ["driver", id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading || !d) {
    return <Skeleton className="h-96 rounded-xl" />;
  }

  const documents = (d.documents ?? []) as DriverDocument[];
  const pendingDocs = documents.filter((doc) => doc.status === "pending").length;
  const allApproved = documents.length > 0 && documents.every((doc) => doc.status === "approved");

  return (
    <div className="space-y-4">
      <BackButton />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* الملف الشخصي */}
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
            <Avatar name={d.name} src={d.avatar} className="h-20 w-20 text-xl" />
            <div>
              <h2 className="text-lg font-bold">{d.name}</h2>
              <p className="text-sm text-muted-foreground" dir="ltr">{d.phone}</p>
            </div>
            {d.status === "approved" ? (
              <StatusBadge status={d.available ? "active" : "closed"} />
            ) : (
              <StatusBadge status={d.status} />
            )}
            <div className="mt-2 w-full">
              <InfoRow label={t("email")} value={<span dir="ltr">{d.email || "—"}</span>} />
              <InfoRow label={t("vehicle")} value={[d.carMake, d.carModel].filter(Boolean).join(" ") || d.vehicleType} />
              <InfoRow label={t("plate")} value={d.plateNumber} />
              <InfoRow label={t("city")} value={d.city} />
              <InfoRow label={t("joinedAt")} value={formatDate(d.createdAt)} />
              <InfoRow
                label={tk("verification")}
                value={
                  allApproved ? (
                    <Badge variant="success">{tk("verified")}</Badge>
                  ) : pendingDocs > 0 ? (
                    <Badge variant="warning">{tk("pendingCount", { count: pendingDocs })}</Badge>
                  ) : (
                    <Badge variant="secondary">{tk("incomplete")}</Badge>
                  )
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* الإحصائيات + الجداول */}
        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t("totalTrips")} value={formatNumber(d.totalTrips)} icon={Route} tone="primary" />
            <StatCard label={t("completedTrips")} value={formatNumber(d.completed_trips)} icon={Car} tone="success" />
            <StatCard label={t("rating")} value={Number(d.rating).toFixed(1)} icon={Star} tone="warning" />
            <StatCard label={t("wallet")} value={formatCurrency(d.walletBalance)} icon={Wallet} tone="success" />
          </div>

          {/* مستندات التوثيق (KYC) */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                {tk("title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pt-4">
              {documents.length === 0 ? (
                <EmptyState message={tk("empty")} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tk("document")}</TableHead>
                      <TableHead>{tk("number")}</TableHead>
                      <TableHead>{tk("expiry")}</TableHead>
                      <TableHead>{tk("status")}</TableHead>
                      <TableHead className="text-end">{tk("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{tk(`type_${doc.type}` as any)}</TableCell>
                        <TableCell dir="ltr" className="text-start text-muted-foreground">{doc.number || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {doc.expiryDate ? formatDate(doc.expiryDate) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              doc.status === "approved" ? "success" : doc.status === "rejected" ? "destructive" : "warning"
                            }
                            className="gap-1"
                          >
                            {doc.status === "approved" ? (
                              <Check className="h-3 w-3" />
                            ) : doc.status === "rejected" ? (
                              <X className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {tk(`st_${doc.status}` as any)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {doc.status !== "approved" && (
                              <Button
                                size="sm"
                                variant="success"
                                disabled={docMut.isPending}
                                onClick={() => docMut.mutate({ docId: doc.id, status: "approved" })}
                              >
                                <Check className="h-4 w-4" />
                                {tk("approve")}
                              </Button>
                            )}
                            {doc.status !== "rejected" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={docMut.isPending}
                                onClick={() => docMut.mutate({ docId: doc.id, status: "rejected" })}
                              >
                                <X className="h-4 w-4" />
                                {tk("reject")}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base">{t("recentTrips")}</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pt-4">
              {!d.trips || d.trips.length === 0 ? (
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
                    {d.trips.map((trip) => (
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
