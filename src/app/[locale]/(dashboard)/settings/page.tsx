"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Loader2, Star, Trash } from "lucide-react";

import { getSettings, saveSettings, getCurrencies, updateCurrency, deleteCurrency } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { confirm } from "@/components/ui/confirm";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const qc = useQueryClient();
  const [form, setForm] = React.useState<Record<string, string>>({});

  const { isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const s = await getSettings();
      setForm(s);
      return s;
    },
  });

  const { data: currencies } = useQuery({
    queryKey: ["currencies"],
    queryFn: getCurrencies,
  });

  const mutation = useMutation({
    mutationFn: () => saveSettings(form),
    onSuccess: () => toast.success(t("saved")),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const currencyMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateCurrency(id, data),
    onSuccess: () => {
      toast.success(t("saved"));
      qc.invalidateQueries({ queryKey: ["currencies"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const delCurrencyMut = useMutation({
    mutationFn: (id: number) => deleteCurrency(id),
    onSuccess: () => {
      toast.success(t("saved"));
      qc.invalidateQueries({ queryKey: ["currencies"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const field = (k: string) => ({ value: form[k] ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value) });

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("save")}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("general")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>{t("appName")}</Label>
              <Input {...field("app_name")} />
            </div>
            <div className="space-y-1">
              <Label>{t("currency")}</Label>
              <Input {...field("currency")} />
            </div>
            <div className="space-y-1">
              <Label>{t("supportPhone")}</Label>
              <Input {...field("support_phone")} dir="ltr" />
            </div>
            <div className="space-y-1">
              <Label>{t("supportEmail")}</Label>
              <Input {...field("support_email")} dir="ltr" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("pricing")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>{t("defaultCommission")}</Label>
              <Input type="number" {...field("default_commission")} />
            </div>
            <div className="space-y-1">
              <Label>{t("vatNumber")}</Label>
              <Input {...field("vat_number")} dir="ltr" placeholder="300000000000003" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("pricingMoved")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* العملات المدعومة */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("currencies")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("currencyCode")}</TableHead>
                <TableHead>{t("currencyName")}</TableHead>
                <TableHead>{t("currencySymbol")}</TableHead>
                <TableHead>{t("currencyFx")}</TableHead>
                <TableHead>{t("currencyBase")}</TableHead>
                <TableHead className="text-end">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(currencies ?? []).map((c) => (
                <TableRow key={c.id} className={c.isBase ? "bg-primary/5" : ""}>
                  <TableCell className="font-mono font-bold" dir="ltr">{c.code}</TableCell>
                  <TableCell>{c.nameAr}</TableCell>
                  <TableCell dir="ltr">{c.symbol}</TableCell>
                  <TableCell>
                    {c.isBase ? (
                      <Badge variant="success">1.000</Badge>
                    ) : (
                      <Input
                        type="number"
                        step="0.001"
                        className="h-8 w-24"
                        defaultValue={c.fxRate}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v > 0 && v !== c.fxRate) currencyMut.mutate({ id: c.id, data: { fxRate: v } });
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {c.isBase ? (
                      <Badge variant="success" className="gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        {t("currencyBase")}
                      </Badge>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => currencyMut.mutate({ id: c.id, data: { isBase: true } })}>
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    {!c.isBase && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => confirm({ message: t("currencyDeleteConfirm"), variant: "danger" }).then((ok) => ok && delCurrencyMut.mutate(c.id))}
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
