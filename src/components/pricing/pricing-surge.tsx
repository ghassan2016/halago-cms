"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Zap } from "lucide-react";

import { getSurgeRules, createSurgeRule, updateSurgeRule, deleteSurgeRule, getDemand } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/data-state";
import { cn } from "@/lib/utils";

export function PricingSurge() {
  const t = useTranslations("pricing");
  const daysShort = t.raw("daysShort") as string[];
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    startHour: 7,
    endHour: 9,
    multiplier: 1.5,
    days: [0, 1, 2, 3, 4] as number[],
  });

  const { data, isLoading } = useQuery({ queryKey: ["surge-rules"], queryFn: getSurgeRules });
  const { data: demand } = useQuery({ queryKey: ["demand"], queryFn: getDemand, refetchInterval: 8000 });

  const createMut = useMutation({
    mutationFn: () => createSurgeRule(form),
    onSuccess: () => {
      toast.success(t("surgeCreated"));
      setOpen(false);
      setForm({ name: "", startHour: 7, endHour: 9, multiplier: 1.5, days: [0, 1, 2, 3, 4] });
      qc.invalidateQueries({ queryKey: ["surge-rules"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => updateSurgeRule(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["surge-rules"] }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => deleteSurgeRule(id),
    onSuccess: () => {
      toast.success(t("surgeDeleted"));
      qc.invalidateQueries({ queryKey: ["surge-rules"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const toggleDay = (d: number) =>
    setForm((f) => ({ ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d].sort() }));

  const rules = data ?? [];

  return (
    <div className="space-y-4">
      {/* مؤشّر الطلب اللحظي + الذروة الديناميكية */}
      {demand && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Zap className="h-4 w-4 text-warning" />
                {t("demandTitle")}
              </p>
              <p className="text-xs text-muted-foreground">{t("demandSubtitle")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Stat label={t("onlineDrivers")} value={demand.onlineDrivers} />
              <Stat label={t("openDemand")} value={demand.demand} />
              <Stat label={t("demandRatio")} value={demand.ratio} />
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t("currentMultiplier")}</p>
                <Badge variant={demand.multiplier > 1 ? "warning" : "secondary"} className="text-sm">
                  ×{demand.multiplier}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("addSurge")}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-warning" />
            {t("surgeTab")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-4">
          {isLoading ? (
            <Skeleton className="mx-4 h-40" />
          ) : rules.length === 0 ? (
            <EmptyState message={t("noSurge")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("surgeName")}</TableHead>
                  <TableHead>{t("surgeDays")}</TableHead>
                  <TableHead>{t("surgeHours")}</TableHead>
                  <TableHead>{t("surgeMultiplier")}</TableHead>
                  <TableHead>{t("active")}</TableHead>
                  <TableHead>{t("surgeActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.days.split(",").map((d) => (
                          <Badge key={d} variant="secondary" className="px-1.5 text-[10px]">
                            {daysShort[Number(d)]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell dir="ltr" className="text-start">
                      {String(r.startHour).padStart(2, "0")}:00 - {String(r.endHour).padStart(2, "0")}:00
                    </TableCell>
                    <TableCell>
                      <Badge variant="warning">×{r.multiplier}</Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => toggleMut.mutate({ id: r.id, active: !r.active })}
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs",
                          r.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {r.active ? "✓" : "✕"}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => confirm({ message: t("deleteConfirm") }).then((ok) => ok && delMut.mutate(r.id))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={t("addSurgeTitle")}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate();
          }}
        >
          <div className="space-y-1">
            <Label>{t("surgeName")}</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>{t("from")}</Label>
              <Input type="number" min={0} max={23} value={form.startHour} onChange={(e) => setForm({ ...form, startHour: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>{t("to")}</Label>
              <Input type="number" min={1} max={24} value={form.endHour} onChange={(e) => setForm({ ...form, endHour: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>{t("surgeMultiplier")}</Label>
              <Input type="number" step="0.1" min={1} value={form.multiplier} onChange={(e) => setForm({ ...form, multiplier: Number(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t("daysHint")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {daysShort.map((d, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs transition-colors",
                    form.days.includes(idx) ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button type="submit" disabled={createMut.isPending}>{t("create")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}
