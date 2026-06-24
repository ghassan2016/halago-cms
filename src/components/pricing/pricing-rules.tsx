"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Loader2, Car, Bike, Info } from "lucide-react";

import { getPricingRules, savePricingRules, type PricingRule } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function PricingRules() {
  const t = useTranslations("pricing");
  const qc = useQueryClient();
  const [rules, setRules] = React.useState<PricingRule[]>([]);

  const { isLoading } = useQuery({
    queryKey: ["pricing-rules"],
    queryFn: async () => {
      const r = await getPricingRules();
      setRules(r);
      return r;
    },
  });

  const mutation = useMutation({
    mutationFn: () => savePricingRules(rules),
    onSuccess: () => {
      toast.success(t("saved"));
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const update = (i: number, key: keyof PricingRule, value: unknown) =>
    setRules((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  if (isLoading) return <Skeleton className="h-80 rounded-xl" />;

  const vLabel = (v: string) => (v === "motorcycle" ? t("motorcycle") : v === "bike" ? t("bike") : t("car"));
  const sLabel = (s: string) => (s === "delivery" ? t("delivery") : t("ride"));

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{t("formula")}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {rules.map((rule, i) => (
          <Card key={rule.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {rule.vehicleType === "motorcycle" ? <Bike className="h-4 w-4" /> : <Car className="h-4 w-4" />}
                {vLabel(rule.vehicleType)}
                <Badge variant="secondary">{sLabel(rule.serviceType)}</Badge>
              </CardTitle>
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={rule.distanceUnit}
                onChange={(e) => update(i, "distanceUnit", e.target.value)}
              >
                <option value="km">{t("km")}</option>
                <option value="mile">{t("mile")}</option>
              </select>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Field label={t("baseFare")} value={rule.baseFare} onChange={(v) => update(i, "baseFare", v)} />
              <Field label={t("bookingFee")} value={rule.bookingFee} onChange={(v) => update(i, "bookingFee", v)} />
              <Field
                label={`${t("perUnit")} (${rule.distanceUnit === "mile" ? t("mile") : t("km")})`}
                value={rule.perKm}
                onChange={(v) => update(i, "perKm", v)}
              />
              <Field label={t("perMinute")} value={rule.perMinute} onChange={(v) => update(i, "perMinute", v)} />
              <Field label={t("waitPerMinute")} value={rule.waitPerMinute} onChange={(v) => update(i, "waitPerMinute", v)} />
              <Field label={t("freeWaitMinutes")} value={rule.freeWaitMinutes} onChange={(v) => update(i, "freeWaitMinutes", v)} />
              <Field label={t("minimumFare")} value={rule.minimumFare} onChange={(v) => update(i, "minimumFare", v)} />
              <Field label={t("cancellationFee")} value={rule.cancellationFee} onChange={(v) => update(i, "cancellationFee", v)} />
              <Field label={t("taxPercent")} value={rule.taxPercent} onChange={(v) => update(i, "taxPercent", v)} />
              <div className="space-y-1">
                <Label className="text-xs">{t("active")}</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={rule.active ? "1" : "0"}
                  onChange={(e) => update(i, "active", e.target.value === "1")}
                >
                  <option value="1">✓</option>
                  <option value="0">✕</option>
                </select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {t("save")}
      </Button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        step="0.1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
