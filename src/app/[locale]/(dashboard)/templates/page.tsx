"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquareText, Plus, Pencil, Trash, ToggleLeft, ToggleRight, Eye } from "lucide-react";

import { getTemplates, createTemplate, updateTemplate, deleteTemplate, type NotificationTemplate } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirm } from "@/components/ui/confirm";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";

function parseJson<T>(s: string | null | undefined, fb: T): T {
  if (!s) return fb;
  try { return JSON.parse(s); } catch { return fb; }
}

function applyVars(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, key) => values[key] ?? `{{${key}}}`);
}

export default function TemplatesPage() {
  const t = useTranslations("templates");
  const qc = useQueryClient();
  const [modal, setModal] = React.useState<{ open: boolean; editing?: NotificationTemplate }>({ open: false });
  const [preview, setPreview] = React.useState<NotificationTemplate | null>(null);
  const [previewVals, setPreviewVals] = React.useState<Record<string, string>>({});
  const [form, setForm] = React.useState({ key: "", name: "", title: "", body: "", audience: "all" });

  const { data: templates, isLoading, isError } = useQuery({
    queryKey: ["templates"],
    queryFn: getTemplates,
  });

  function reset() { setForm({ key: "", name: "", title: "", body: "", audience: "all" }); }
  function openCreate() { reset(); setModal({ open: true }); }
  function openEdit(tpl: NotificationTemplate) {
    setForm({ key: tpl.key, name: tpl.name, title: tpl.title, body: tpl.body, audience: tpl.audience });
    setModal({ open: true, editing: tpl });
  }

  const createMut = useMutation({
    mutationFn: () => createTemplate(form),
    onSuccess: () => { toast.success(t("saved")); setModal({ open: false }); qc.invalidateQueries({ queryKey: ["templates"] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateTemplate(id, data),
    onSuccess: () => { toast.success(t("saved")); setModal({ open: false }); qc.invalidateQueries({ queryKey: ["templates"] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteTemplate(id),
    onSuccess: () => { toast.success(t("deleted")); qc.invalidateQueries({ queryKey: ["templates"] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function onSave() {
    if (modal.editing) {
      const { key, ...rest } = form;
      updateMut.mutate({ id: modal.editing.id, data: rest });
    } else {
      createMut.mutate();
    }
  }

  function openPreview(tpl: NotificationTemplate) {
    setPreview(tpl);
    const vars = parseJson<string[]>(tpl.variables, []);
    const initial: Record<string, string> = {};
    vars.forEach((v) => { initial[v] = ""; });
    setPreviewVals(initial);
  }

  const rows = templates ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquareText className="h-6 w-6 text-primary" />
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t("add")}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-4">
          {isLoading ? (
            <TableSkeleton cols={6} />
          ) : isError ? (
            <ErrorState />
          ) : rows.length === 0 ? (
            <EmptyState message={t("empty")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("key")}</TableHead>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("audience")}</TableHead>
                  <TableHead>{t("variables")}</TableHead>
                  <TableHead>{t("active")}</TableHead>
                  <TableHead className="text-end">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((tpl) => {
                  const vars = parseJson<string[]>(tpl.variables, []);
                  return (
                    <TableRow key={tpl.id}>
                      <TableCell className="font-mono text-xs">{tpl.key}</TableCell>
                      <TableCell className="font-medium">{tpl.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{t(`audience_${tpl.audience}` as any)}</Badge>
                      </TableCell>
                      <TableCell>
                        {vars.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {vars.map((v) => (
                              <Badge key={v} variant="outline" className="font-mono text-[10px]" dir="ltr">{`{{${v}}}`}</Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => updateMut.mutate({ id: tpl.id, data: { active: !tpl.active } })}>
                          {tpl.active ? <ToggleRight className="h-5 w-5 text-success" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                        </Button>
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => openPreview(tpl)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEdit(tpl)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => confirm({ message: t("deleteConfirm"), variant: "danger" }).then((ok) => ok && deleteMut.mutate(tpl.id))}
                          >
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* مودال إضافة/تعديل */}
      <Modal open={modal.open} onClose={() => setModal({ open: false })} title={modal.editing ? t("editTitle") : t("addTitle")} className="max-w-lg">
        <div className="space-y-3">
          <div>
            <Label htmlFor="key">{t("key")}</Label>
            <Input id="key" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} disabled={!!modal.editing} placeholder="welcome_driver" dir="ltr" />
          </div>
          <div>
            <Label htmlFor="name">{t("name")}</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="title">{t("templateTitle")}</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مرحباً {{name}}" />
          </div>
          <div>
            <Label htmlFor="body">{t("body")}</Label>
            <textarea
              id="body"
              className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="رحلتك {{trip_no}} في الطريق..."
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("variablesHint")}</p>
          </div>
          <div>
            <Label htmlFor="audience">{t("audience")}</Label>
            <select id="audience" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
              <option value="all">{t("audience_all")}</option>
              <option value="drivers">{t("audience_drivers")}</option>
              <option value="customers">{t("audience_customers")}</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModal({ open: false })}>{t("cancel")}</Button>
            <Button onClick={onSave} disabled={createMut.isPending || updateMut.isPending}>{t("save")}</Button>
          </div>
        </div>
      </Modal>

      {/* مودال معاينة مع تعبئة المتغيّرات */}
      {preview && (
        <Modal open onClose={() => setPreview(null)} title={t("previewTitle")} className="max-w-lg">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{t("previewHint")}</p>
            {parseJson<string[]>(preview.variables, []).map((v) => (
              <div key={v}>
                <Label htmlFor={`pv-${v}`} className="font-mono" dir="ltr">{`{{${v}}}`}</Label>
                <Input id={`pv-${v}`} value={previewVals[v] || ""} onChange={(e) => setPreviewVals((c) => ({ ...c, [v]: e.target.value }))} />
              </div>
            ))}
            <div className="rounded border bg-card p-4">
              <h4 className="font-semibold">{applyVars(preview.title, previewVals)}</h4>
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{applyVars(preview.body, previewVals)}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
