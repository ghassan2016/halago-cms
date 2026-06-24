"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Crown, Users } from "lucide-react";

import { getVehicleClasses, createVehicleClass, updateVehicleClass, deleteVehicleClass } from "@/services";
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

export function PricingClasses() {
  const t = useTranslations("pricing");
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ key: "", name: "", multiplier: 1, capacity: 4, sortOrder: 5 });

  const { data, isLoading } = useQuery({ queryKey: ["vehicle-classes"], queryFn: getVehicleClasses });

  const createMut = useMutation({
    mutationFn: () => createVehicleClass(form),
    onSuccess: () => {
      toast.success(t("classCreated"));
      setOpen(false);
      setForm({ key: "", name: "", multiplier: 1, capacity: 4, sortOrder: 5 });
      qc.invalidateQueries({ queryKey: ["vehicle-classes"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => updateVehicleClass(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicle-classes"] }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => deleteVehicleClass(id),
    onSuccess: () => {
      toast.success(t("classDeleted"));
      qc.invalidateQueries({ queryKey: ["vehicle-classes"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const classes = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("addClass")}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-4 w-4 text-warning" />
            {t("classesTab")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-4">
          {isLoading ? (
            <Skeleton className="mx-4 h-40" />
          ) : classes.length === 0 ? (
            <EmptyState message={t("noClasses")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("className")}</TableHead>
                  <TableHead>{t("classKey")}</TableHead>
                  <TableHead>{t("classMultiplier")}</TableHead>
                  <TableHead>{t("capacity")}</TableHead>
                  <TableHead>{t("active")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell dir="ltr" className="text-start font-mono text-xs text-muted-foreground">{c.key}</TableCell>
                    <TableCell>
                      <Badge variant={c.multiplier > 1 ? "warning" : "secondary"}>×{c.multiplier}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {c.capacity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => toggleMut.mutate({ id: c.id, active: !c.active })}
                        className={cn("rounded-full px-2 py-0.5 text-xs", c.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}
                      >
                        {c.active ? "✓" : "✕"}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => confirm({ message: t("classDeleteConfirm") }).then((ok) => ok && delMut.mutate(c.id))}>
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

      <Modal open={open} onClose={() => setOpen(false)} title={t("addClassTitle")}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("className")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>{t("classKey")}</Label>
              <Input dir="ltr" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="comfort" required />
            </div>
            <div className="space-y-1">
              <Label>{t("classMultiplier")}</Label>
              <Input type="number" step="0.05" value={form.multiplier} onChange={(e) => setForm({ ...form, multiplier: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>{t("capacity")}</Label>
              <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
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
