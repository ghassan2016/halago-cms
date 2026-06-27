"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, Car, Wallet, Route, FileText, Check, X, Clock, Ban, AlertTriangle } from "lucide-react";

import { getDriver, reviewDriverDocument, updateDriver, adjustWallet } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirm } from "@/components/ui/confirm";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/stat-card";
import { BackButton, InfoRow } from "@/components/detail-helpers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/data-state";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { DriverDocument } from "@/types";

const TIER_VARIANT: Record<string, "secondary" | "outline" | "warning" | "default"> = {
  bronze: "secondary",
  silver: "outline",
  gold: "warning",
  platinum: "default",
};

export default function DriverDetailPage() {
  const t = useTranslations("details");
  const tt = useTranslations("trips");
  const tk = useTranslations("kyc");
  const qc = useQueryClient();
  const params = useParams();
  const id = params.id as string;

  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");

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

  const banMut = useMutation({
    mutationFn: (banReason: string) => updateDriver(id, { status: "banned", banReason }),
    onSuccess: () => {
      toast.success(t("banned"));
      qc.invalidateQueries({ queryKey: ["driver", id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const walletMut = useMutation({
    mutationFn: (amt: number) => adjustWallet("driver", Number(id), amt, note),
    onSuccess: () => {
      toast.success(t("walletAdjusted"));
      setAmount("");
      setNote("");
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
  const tier = (d as any).tier as string | undefined;
  const banReason = (d as any).banReason as string | undefined;
  const expiringDocs = ((d as any).expiringDocs ?? []) as DriverDocument[];

  async function onBan() {
    const ok = await confirm({ message: t("banConfirm"), variant: "danger" });
    if (!ok) return;
    const reason = window.prompt(t("banReasonPrompt"))?.trim();
    if (!reason) return;
    banMut.mutate(reason);
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
        {/* الملف الشخصي */}
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
            <Avatar name={d.name} src={d.avatar} className="h-20 w-20 text-xl" />
            <div>
              <h2 className="text-lg font-bold">{d.name}</h2>
              <p className="text-sm text-muted-foreground" dir="ltr">{d.phone}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {d.status === "approved" ? (
                <StatusBadge status={d.available ? "active" : "closed"} />
              ) : (
                <StatusBadge status={d.status} />
              )}
              {tier ? (
                <Badge variant={TIER_VARIANT[tier] ?? "secondary"}>{t(`tier_${tier}` as any)}</Badge>
              ) : null}
            </div>
            {d.status === "banned" && banReason ? (
              <div className="w-full rounded-md bg-destructive/10 p-2 text-start text-xs text-destructive">
                <span className="font-medium">{t("banReason")}: </span>
                {banReason}
              </div>
            ) : null}
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

            {/* تعديل الرصيد (تعويض/خصم) */}
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

            {/* حظر نهائي */}
            {d.status !== "banned" ? (
              <div className="mt-4 w-full space-y-2 border-t pt-4 text-start">
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={banMut.isPending}
                  onClick={onBan}
                >
                  <Ban className="h-4 w-4" />
                  {t("ban")}
                </Button>
                <p className="text-xs text-muted-foreground">{t("banNote")}</p>
              </div>
            ) : null}
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

          {/* وثائق قاربت على الانتهاء */}
          {expiringDocs.length > 0 ? (
            <Card className="border-warning/40 bg-warning/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  {t("expiringDocs")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">{t("expiringDocsHint")}</p>
                <ul className="space-y-1">
                  {expiringDocs.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{tk(`type_${doc.type}` as any)}</span>
                      <span className="text-muted-foreground">
                        {t("expiresOn")}: {doc.expiryDate ? formatDate(doc.expiryDate) : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

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
