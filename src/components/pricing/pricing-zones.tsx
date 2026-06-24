"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, MapPin } from "lucide-react";

import { getZones, createZone, updateZone, deleteZone } from "@/services";
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

export function PricingZones() {
  const t = useTranslations("pricing");
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", city: "", centerLat: 24.7136, centerLng: 46.6753, radiusKm: 25, priceMultiplier: 1 });

  const { data, isLoading } = useQuery({ queryKey: ["zones"], queryFn: getZones });

  const createMut = useMutation({
    mutationFn: () => createZone(form),
    onSuccess: () => {
      toast.success(t("zoneCreated"));
      setOpen(false);
      setForm({ name: "", city: "", centerLat: 24.7136, centerLng: 46.6753, radiusKm: 25, priceMultiplier: 1 });
      qc.invalidateQueries({ queryKey: ["zones"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => updateZone(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["zones"] }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => deleteZone(id),
    onSuccess: () => {
      toast.success(t("zoneDeleted"));
      qc.invalidateQueries({ queryKey: ["zones"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const zones = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("addZone")}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" />
            {t("zonesTab")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-4">
          {isLoading ? (
            <Skeleton className="mx-4 h-40" />
          ) : zones.length === 0 ? (
            <EmptyState message={t("noZones")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("zoneName")}</TableHead>
                  <TableHead>{t("city")}</TableHead>
                  <TableHead>{t("radiusKm")}</TableHead>
                  <TableHead>{t("zoneMultiplier")}</TableHead>
                  <TableHead>{t("active")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((z) => (
                  <TableRow key={z.id}>
                    <TableCell className="font-medium">{z.name}</TableCell>
                    <TableCell className="text-muted-foreground">{z.city}</TableCell>
                    <TableCell dir="ltr" className="text-start">{z.radiusKm} km</TableCell>
                    <TableCell>
                      <Badge variant={z.priceMultiplier > 1 ? "warning" : z.priceMultiplier < 1 ? "success" : "secondary"}>
                        ×{z.priceMultiplier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => toggleMut.mutate({ id: z.id, active: !z.active })}
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs",
                          z.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {z.active ? "✓" : "✕"}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => confirm({ message: t("zoneDeleteConfirm") }).then((ok) => ok && delMut.mutate(z.id))}>
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

      <Modal open={open} onClose={() => setOpen(false)} title={t("addZoneTitle")}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("zoneName")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>{t("city")}</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>{t("centerLat")}</Label>
              <Input type="number" step="0.0001" dir="ltr" value={form.centerLat} onChange={(e) => setForm({ ...form, centerLat: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>{t("centerLng")}</Label>
              <Input type="number" step="0.0001" dir="ltr" value={form.centerLng} onChange={(e) => setForm({ ...form, centerLng: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>{t("radiusKm")}</Label>
              <Input type="number" value={form.radiusKm} onChange={(e) => setForm({ ...form, radiusKm: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>{t("zoneMultiplier")}</Label>
              <Input type="number" step="0.05" value={form.priceMultiplier} onChange={(e) => setForm({ ...form, priceMultiplier: Number(e.target.value) })} />
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
