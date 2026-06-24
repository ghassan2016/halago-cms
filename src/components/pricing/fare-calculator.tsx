"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Calculator, Zap, MapPin, Crown, Ticket } from "lucide-react";

import { estimateFare, getZones, getVehicleClasses, getExtraFees } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency, cn } from "@/lib/utils";

export function FareCalculator() {
  const t = useTranslations("pricing");
  const days = t.raw("days") as string[];
  const [form, setForm] = React.useState({
    vehicleType: "car",
    serviceType: "ride",
    distance: 8,
    duration: 15,
    waitMinutes: 0,
    zoneId: "",
    classKey: "",
    extraFeeIds: [] as number[],
    promoCode: "",
    day: new Date().getDay(),
    hour: new Date().getHours(),
  });

  const { data: zones } = useQuery({ queryKey: ["zones"], queryFn: getZones });
  const { data: classes } = useQuery({ queryKey: ["vehicle-classes"], queryFn: getVehicleClasses });
  const { data: fees } = useQuery({ queryKey: ["extra-fees"], queryFn: getExtraFees });

  const mutation = useMutation({
    mutationFn: () =>
      estimateFare({
        ...form,
        zoneId: form.zoneId || undefined,
        classKey: form.classKey || undefined,
        promoCode: form.promoCode || undefined,
      }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const r = mutation.data;
  const unit = r?.distanceUnit === "mile" ? t("mile") : t("km");
  const toggleFee = (id: number) =>
    setForm((f) => ({ ...f, extraFeeIds: f.extraFeeIds.includes(id) ? f.extraFeeIds.filter((x) => x !== id) : [...f.extraFeeIds, id] }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4" />
            {t("calcTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("vehicle")}</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
                  <option value="car">{t("car")}</option>
                  <option value="motorcycle">{t("motorcycle")}</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>{t("service")}</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}>
                  <option value="ride">{t("ride")}</option>
                  <option value="delivery">{t("delivery")}</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>{t("distance")}</Label>
                <Input type="number" step="0.1" value={form.distance} onChange={(e) => setForm({ ...form, distance: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label>{t("duration")}</Label>
                <Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label>{t("waitMinutes")}</Label>
                <Input type="number" value={form.waitMinutes} onChange={(e) => setForm({ ...form, waitMinutes: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1"><Crown className="h-3.5 w-3.5" />{t("vehicleClass")}</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.classKey} onChange={(e) => setForm({ ...form, classKey: e.target.value })}>
                  <option value="">{t("noClass")}</option>
                  {(classes ?? []).filter((c) => c.active).map((c) => (
                    <option key={c.id} value={c.key}>{c.name} (×{c.multiplier})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{t("zone")}</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.zoneId} onChange={(e) => setForm({ ...form, zoneId: e.target.value })}>
                  <option value="">{t("noZone")}</option>
                  {(zones ?? []).map((z) => (<option key={z.id} value={z.id}>{z.name} (×{z.priceMultiplier})</option>))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>{t("day")}</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.day} onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}>
                  {days.map((d, idx) => (<option key={idx} value={idx}>{d}</option>))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>{t("hour")}</Label>
                <Input type="number" min={0} max={23} value={form.hour} onChange={(e) => setForm({ ...form, hour: Number(e.target.value) })} />
              </div>
            </div>

            {/* الرسوم الخاصة */}
            {(fees ?? []).filter((f) => f.active).length > 0 && (
              <div className="space-y-1">
                <Label>{t("extras")}</Label>
                <div className="flex flex-wrap gap-2">
                  {(fees ?? []).filter((f) => f.active).map((f) => (
                    <button key={f.id} type="button" onClick={() => toggleFee(f.id)} className={cn("rounded-md border px-2.5 py-1 text-xs transition-colors", form.extraFeeIds.includes(f.id) ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground")}>
                      {f.name} (+{f.amount})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* الكوبون */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1"><Ticket className="h-3.5 w-3.5" />{t("promoCode")}</Label>
              <Input dir="ltr" value={form.promoCode} onChange={(e) => setForm({ ...form, promoCode: e.target.value })} placeholder={t("promoPlaceholder")} />
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              <Calculator className="h-4 w-4" />
              {t("calculate")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("result")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!r ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">— {t("calculate")} —</div>
          ) : (
            <div className="space-y-1.5">
              <Row label={t("baseFare")} value={formatCurrency(r.baseFare, r.currency)} />
              <Row label={`${t("distanceCost")} (${r.distance} ${unit})`} value={formatCurrency(r.distanceCost, r.currency)} />
              <Row label={`${t("timeCost")} (${r.duration})`} value={formatCurrency(r.timeCost, r.currency)} />
              {r.waitCost > 0 && <Row label={`${t("waitCost")} (${r.waitMinutes})`} value={formatCurrency(r.waitCost, r.currency)} />}
              <Row label={t("subtotal")} value={formatCurrency(r.meteredBase, r.currency)} bold />

              {r.zoneMultiplier !== 1 && (
                <Line icon={<MapPin className="h-4 w-4" />} tone="primary" label={<>{r.zoneName} <Badge variant="default">×{r.zoneMultiplier}</Badge></>} value={`${r.zoneAmount >= 0 ? "+" : ""}${formatCurrency(r.zoneAmount, r.currency)}`} />
              )}
              {r.classMultiplier !== 1 && (
                <Line icon={<Crown className="h-4 w-4" />} tone="warning" label={<>{r.className} <Badge variant="warning">×{r.classMultiplier}</Badge></>} value={`+${formatCurrency(r.classAmount, r.currency)}`} />
              )}
              {r.surgeMultiplier > 1 ? (
                <Line icon={<Zap className="h-4 w-4" />} tone="warning" label={<>{r.surgeName} <Badge variant="warning">×{r.surgeMultiplier}</Badge> <span className="text-xs">({r.surgeSource === "dynamic" ? t("surgeDynamic") : t("surgeScheduled")})</span></>} value={`+${formatCurrency(r.surgeAmount, r.currency)}`} />
              ) : (
                <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{t("noSurgeNow")}</div>
              )}
              {r.minimumApplied && <div className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs text-primary">{t("minimumApplied")}</div>}

              <Row label={t("bookingFeeLabel")} value={formatCurrency(r.bookingFee, r.currency)} />
              {(r.extras ?? []).map((ex: any, i: number) => (
                <Row key={i} label={ex.name} value={formatCurrency(ex.amount, r.currency)} />
              ))}
              <Row label={t("beforeTax")} value={formatCurrency(r.beforeTax, r.currency)} />
              <Row label={`${t("tax")} (${r.taxPercent}%)`} value={formatCurrency(r.tax, r.currency)} />

              {r.promoError && <div className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs text-destructive">{r.promoError}</div>}
              {r.promoApplied && (
                <Line icon={<Ticket className="h-4 w-4" />} tone="success" label={<>{r.promoCode}</>} value={`−${formatCurrency(r.discount, r.currency)}`} />
              )}

              <div className="mt-2 flex items-center justify-between border-t pt-3">
                <span className="font-bold">{t("finalTotal")}</span>
                <div className="text-end">
                  {r.discount > 0 && <span className="me-2 text-sm text-muted-foreground line-through">{formatCurrency(r.total, r.currency)}</span>}
                  <span className="text-2xl font-bold text-primary">{formatCurrency(r.finalTotal, r.currency)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-bold" : "font-medium"}>{value}</span>
    </div>
  );
}

function Line({ icon, label, value, tone }: { icon: React.ReactNode; label: React.ReactNode; value: string; tone: "primary" | "warning" | "success" }) {
  const tones = { primary: "bg-primary/10 text-primary", warning: "bg-warning/10 text-warning", success: "bg-success/10 text-success" };
  return (
    <div className={cn("flex items-center justify-between rounded-lg px-3 py-2 text-sm", tones[tone])}>
      <span className="flex items-center gap-1.5">{icon}{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
