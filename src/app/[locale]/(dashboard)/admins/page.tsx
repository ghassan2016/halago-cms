"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { getAdmins, createAdmin, updateAdmin, deleteAdmin } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";
import { PermissionsMatrix } from "@/components/permissions-matrix";
import { formatDate } from "@/lib/utils";

const ROLES = ["super_admin", "operations", "finance", "support"];

export default function AdminsPage() {
  const t = useTranslations("admins");
  const qc = useQueryClient();
  const meId = useAuthStore((s) => s.profile?.id);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", email: "", password: "", role: "support" });

  const { data, isLoading, isError } = useQuery({ queryKey: ["admins"], queryFn: getAdmins });

  const createMut = useMutation({
    mutationFn: () => createAdmin(form),
    onSuccess: () => {
      toast.success(t("created"));
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "support" });
      qc.invalidateQueries({ queryKey: ["admins"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => updateAdmin(id, { role }),
    onSuccess: () => {
      toast.success(t("updated"));
      qc.invalidateQueries({ queryKey: ["admins"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => deleteAdmin(id),
    onSuccess: () => {
      toast.success(t("deleted"));
      qc.invalidateQueries({ queryKey: ["admins"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const admins = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("create")}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-4">
          {isLoading ? (
            <TableSkeleton cols={5} />
          ) : isError ? (
            <ErrorState />
          ) : admins.length === 0 ? (
            <EmptyState message={t("empty")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("role")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("joinedAt")}</TableHead>
                  <TableHead>{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((a) => {
                  const isMe = String(a.id) === String(meId);
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={a.name} className="h-9 w-9" />
                          <div>
                            <p className="font-medium">
                              {a.name} {isMe && <span className="text-xs text-primary">({t("you")})</span>}
                            </p>
                            <p className="text-xs text-muted-foreground" dir="ltr">{a.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isMe ? (
                          <Badge>{t(`role_${a.role}` as any)}</Badge>
                        ) : (
                          <select
                            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                            value={a.role}
                            onChange={(e) => roleMut.mutate({ id: a.id, role: e.target.value })}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {t(`role_${r}` as any)}
                              </option>
                            ))}
                          </select>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={a.active ? "success" : "destructive"}>
                          {a.active ? "●" : "○"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(a.createdAt)}</TableCell>
                      <TableCell>
                        {!isMe && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => confirm({ message: t("deleteConfirm") }).then((ok) => ok && delMut.mutate(a.id))}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PermissionsMatrix />

      <Modal open={open} onClose={() => setOpen(false)} title={t("createTitle")}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate();
          }}
        >
          <div className="space-y-1">
            <Label>{t("name")}</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-1">
            <Label>{t("email")}</Label>
            <Input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="space-y-1">
            <Label>{t("password")}</Label>
            <Input type="password" dir="ltr" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <div className="space-y-1">
            <Label>{t("role")}</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`role_${r}` as any)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button type="submit" disabled={createMut.isPending}>{t("save")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
