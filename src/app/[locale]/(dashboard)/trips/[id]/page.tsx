"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, CircleDot, Car, Package, User, Repeat, Ban, Undo2, Star, FileText, Play } from "lucide-react";

import { getTrip, getAvailableDrivers, cancelTrip, reassignTrip, refundTrip } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { confirm } from "@/components/ui/confirm";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { BackButton, InfoRow } from "@/components/detail-helpers";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function TripDetailPage() {
  const t = useTranslations("details");
  const tt = useTranslations("trips");
  const td = useTranslations("dispatch");
  const qc = useQueryClient();
  const params = useParams();
  const id = params.id as string;

  const [reassignOpen, setReassignOpen] = React.useState(false);
  const [selectedDriver, setSelectedDriver] = React.useState<number | "">("");

  const { data: trip, isLoading } = useQuery({ queryKey: ["trip", id], queryFn: () => getTrip(id) });

  const refresh = () => qc.invalidateQueries({ queryKey: ["trip", id] });

  const cancelMut = useMutation({
    mutationFn: () => cancelTrip(id),
    onSuccess: () => { toast.success(td("cancelled")); refresh(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const refundMut = useMutation({
    mutationFn: () => refundTrip(id),
    onSuccess: () => { toast.success(td("refunded")); refresh(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const reassignMut = useMutation({
    mutationFn: (driverId: number) => reassignTrip(id, driverId),
    onSuccess: () => { toast.success(td("reassigned")); setReassignOpen(false); setSelectedDriver(""); refresh(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const { data: availableDrivers } = useQuery({
    queryKey: ["available-drivers"],
    queryFn: getAvailableDrivers,
    enabled: reassignOpen,
  });

  if (isLoading || !trip) {
    return <Skeleton className="h-96 rounded-xl" />;
  }

  const net = (trip.fare || 0) - (trip.commission || 0);
  const isFinal = trip.status === "completed" || trip.status === "cancelled";
  const canRefund = trip.paymentStatus === "paid" && (trip.fare || 0) > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <BackButton />
        <div className="flex items-center gap-2">
          <Badge variant={trip.type === "ride" ? "default" : "warning"} className="gap-1">
            {trip.type === "ride" ? <Car className="h-3 w-3" /> : <Package className="h-3 w-3" />}
            {trip.type === "ride" ? tt("ride") : tt("delivery")}
          </Badge>
          <StatusBadge status={trip.status} />
        </div>
      </div>

      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">{trip.number}</h2>
          <p className="text-sm text-muted-foreground">{formatDateTime(trip.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/trips/${trip.id}/replay`}>
            <Button variant="outline">
              <Play className="h-4 w-4" />
              {t("route")}
            </Button>
          </Link>
          {trip.status === "completed" && trip.paymentStatus !== "refunded" && (
            <Link href={`/trips/${trip.id}/invoice`}>
              <Button variant="outline">
                <FileText className="h-4 w-4" />
                {t("fareBreakdown")}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* لوحة التدخّل الإداري (Dispatch) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{td("title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={isFinal || reassignMut.isPending}
            onClick={() => setReassignOpen(true)}
          >
            <Repeat className="h-4 w-4" />
            {td("reassign")}
          </Button>
          <Button
            variant="outline"
            disabled={isFinal || cancelMut.isPending}
            onClick={() => confirm({ message: td("cancelConfirm"), title: td("cancel") }).then((ok) => ok && cancelMut.mutate())}
          >
            <Ban className="h-4 w-4" />
            {td("cancel")}
          </Button>
          <Button
            variant="outline"
            disabled={!canRefund || refundMut.isPending}
            onClick={() => confirm({ message: td("refundConfirm"), title: td("refund"), variant: "default" }).then((ok) => ok && refundMut.mutate())}
          >
            <Undo2 className="h-4 w-4" />
            {td("refund")}
          </Button>
          {isFinal && <p className="self-center text-xs text-muted-foreground">{td("finalNote")}</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* المسار */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("route")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <CircleDot className="mt-0.5 h-5 w-5 text-success" />
              <div>
                <p className="text-xs text-muted-foreground">{t("pickup")}</p>
                <p className="font-medium">{trip.pickupAddress || "—"}</p>
              </div>
            </div>
            <div className="ms-2.5 h-6 border-s-2 border-dashed" />
            <div className="flex gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">{t("dropoff")}</p>
                <p className="font-medium">{trip.dropAddress || "—"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <InfoRow label={t("distance")} value={`${trip.distance} ${t("km")}`} />
              <InfoRow label={t("duration")} value={`${trip.duration} ${t("min")}`} />
            </div>
          </CardContent>
        </Card>

        {/* تفاصيل الأجرة */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("fareBreakdown")}</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label={t("fare")} value={formatCurrency(trip.fare)} />
            <InfoRow label={t("commission")} value={formatCurrency(trip.commission)} />
            <InfoRow label={t("netDriver")} value={formatCurrency(net)} />
            <InfoRow label={t("paymentMethod")} value={trip.paymentMethod} />
            <InfoRow
              label={t("paymentStatus")}
              value={
                trip.paymentStatus === "refunded" ? (
                  <Badge variant="destructive">{td("refundedBadge")}</Badge>
                ) : (
                  <StatusBadge status={trip.paymentStatus === "paid" ? "active" : "pending"} />
                )
              }
            />
            {trip.rating ? (
              <InfoRow
                label={t("rating")}
                value={<span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-warning text-warning" />{trip.rating}</span>}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* الأطراف */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              {tt("customer")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Avatar name={trip.customer?.name || "?"} className="h-12 w-12" />
            <div>
              <p className="font-medium">{trip.customer?.name || "—"}</p>
              <p className="text-sm text-muted-foreground" dir="ltr">{trip.customer?.phone || ""}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Car className="h-4 w-4" />
              {tt("driver")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Avatar name={trip.driver?.name || "?"} className="h-12 w-12" />
            <div>
              <p className="font-medium">{trip.driver?.name || td("noDriver")}</p>
              <p className="text-sm text-muted-foreground" dir="ltr">{trip.driver?.phone || ""}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* نافذة إعادة التعيين */}
      <Modal open={reassignOpen} onClose={() => setReassignOpen(false)} title={td("reassignTitle")}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{td("reassignHint")}</p>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">{td("selectDriver")}</option>
            {(availableDrivers ?? []).map((dr) => (
              <option key={dr.id} value={dr.id}>
                {dr.name} — ⭐ {Number(dr.rating).toFixed(1)} {dr.available ? `· ${td("online")}` : ""}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setReassignOpen(false)}>{td("cancelBtn")}</Button>
            <Button
              disabled={!selectedDriver || reassignMut.isPending}
              onClick={() => selectedDriver && reassignMut.mutate(Number(selectedDriver))}
            >
              {td("confirmReassign")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
