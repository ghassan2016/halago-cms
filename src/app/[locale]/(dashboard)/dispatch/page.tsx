"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Radio, Car, Package, Activity, Clock, CalendarClock, UserPlus, Eye, RadioReceiver } from "lucide-react";

import { api, getErrorMessage, unwrap } from "@/lib/api";
import { reassignTrip } from "@/services";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/data-state";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import type { LiveDriver } from "@/services";

const LiveMap = dynamic(() => import("@/components/live-map"), { ssr: false });

interface DispatchTrip {
  id: number;
  number: string;
  type: string;
  status: string;
  pickupAddress?: string | null;
  dropAddress?: string | null;
  fare: number;
  scheduledAt?: string | null;
  createdAt: string;
  customer?: { id: number; name: string; phone: string } | null;
  driver?: { id: number; name: string; phone: string; vehicleType?: string } | null;
}

interface DispatchData {
  waitingTrips: DispatchTrip[];
  availableDrivers: LiveDriver[];
  stats: { waiting: number; available: number; busy: number; scheduledSoon: number };
}

async function getDispatch(): Promise<DispatchData> {
  return unwrap<DispatchData>((await api.get("/dispatch")).data);
}

export default function DispatchPage() {
  const t = useTranslations("dispatchPanel");
  const tt = useTranslations("trips");
  const qc = useQueryClient();
  const [selectedTrip, setSelectedTrip] = React.useState<number | null>(null);
  const [selectedDriverId, setSelectedDriverId] = React.useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["dispatch"],
    queryFn: getDispatch,
    refetchInterval: 5000,
  });

  const assignMut = useMutation({
    mutationFn: ({ tripId, driverId }: { tripId: number; driverId: number }) => reassignTrip(tripId, driverId),
    onSuccess: () => {
      toast.success(t("assigned"));
      setSelectedTrip(null);
      setSelectedDriverId(null);
      qc.invalidateQueries({ queryKey: ["dispatch"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Radio className="h-6 w-6 text-destructive animate-pulse" />
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Badge variant="success" className="gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-current animate-pulse" />
          {t("live")}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("waiting")} value={data.stats.waiting} icon={Clock} tone="warning" />
        <StatCard label={t("available")} value={data.stats.available} icon={RadioReceiver} tone="success" />
        <StatCard label={t("busy")} value={data.stats.busy} icon={Activity} tone="primary" />
        <StatCard label={t("scheduledSoon")} value={data.stats.scheduledSoon} icon={CalendarClock} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* قائمة الرحلات */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("tripsList")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[520px] overflow-y-auto">
            {data.waitingTrips.length === 0 ? (
              <EmptyState message={t("noTrips")} />
            ) : (
              data.waitingTrips.map((trip) => (
                <div
                  key={trip.id}
                  className={`rounded-lg border p-3 transition-colors ${selectedTrip === trip.id ? "border-primary bg-primary/5" : "hover:bg-accent"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant={trip.type === "ride" ? "default" : "warning"} className="gap-1 shrink-0">
                        {trip.type === "ride" ? <Car className="h-3 w-3" /> : <Package className="h-3 w-3" />}
                        {trip.type === "ride" ? tt("ride") : tt("delivery")}
                      </Badge>
                      <Link href={`/trips/${trip.id}`} className="font-mono text-sm hover:underline">
                        {trip.number}
                      </Link>
                      {trip.scheduledAt && (
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <CalendarClock className="h-3 w-3" />
                          {formatDateTime(trip.scheduledAt)}
                        </Badge>
                      )}
                    </div>
                    <span className="font-medium text-sm">{formatCurrency(trip.fare)}</span>
                  </div>
                  <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    <div className="truncate">📍 {trip.pickupAddress || "—"}</div>
                    <div className="truncate">🏁 {trip.dropAddress || "—"}</div>
                    <div>👤 {trip.customer?.name || "—"}</div>
                  </div>
                  <div className="mt-2 flex justify-end gap-2">
                    <Link href={`/trips/${trip.id}`}>
                      <Button size="sm" variant="ghost">
                        <Eye className="h-3.5 w-3.5" />
                        {t("viewTrip")}
                      </Button>
                    </Link>
                    {!trip.driver && (
                      <Button
                        size="sm"
                        variant={selectedTrip === trip.id ? "default" : "outline"}
                        onClick={() => {
                          setSelectedTrip(trip.id);
                          setSelectedDriverId(null);
                        }}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        {t("assignTo")}
                      </Button>
                    )}
                  </div>

                  {/* قائمة السائقين عند الإسناد */}
                  {selectedTrip === trip.id && (
                    <div className="mt-3 space-y-1 border-t pt-3">
                      {data.availableDrivers.slice(0, 8).map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setSelectedDriverId(d.id)}
                          className={`flex w-full items-center justify-between rounded-md border p-2 text-sm transition-colors ${
                            selectedDriverId === d.id ? "border-primary bg-primary/10" : "hover:bg-accent"
                          }`}
                        >
                          <span>{d.name}</span>
                          <span className="text-xs text-muted-foreground">⭐ {Number(d.rating).toFixed(1)} • {d.vehicleType}</span>
                        </button>
                      ))}
                      <div className="flex justify-end gap-2 pt-2">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedTrip(null)}>
                          {tt("cancel" as any) || "Cancel"}
                        </Button>
                        <Button
                          size="sm"
                          disabled={!selectedDriverId || assignMut.isPending}
                          onClick={() => selectedDriverId && assignMut.mutate({ tripId: trip.id, driverId: selectedDriverId })}
                        >
                          {t("assignTo")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* خريطة السائقين المتاحين */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("driversMap")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[520px] w-full overflow-hidden rounded-b-xl">
              {data.availableDrivers.length === 0 ? (
                <EmptyState message={t("noDrivers")} />
              ) : (
                <LiveMap drivers={data.availableDrivers} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
