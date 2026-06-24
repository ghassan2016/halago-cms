"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Bell, Users, Car } from "lucide-react";

import { getNotifications, sendNotification } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton, EmptyState } from "@/components/data-state";
import { Pagination } from "@/components/list-toolbar";
import { formatNumber, formatDateTime } from "@/lib/utils";

export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const qc = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [form, setForm] = React.useState({ title: "", body: "", audience: "all" });

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", page],
    queryFn: () => getNotifications({ page }),
  });

  const sendMut = useMutation({
    mutationFn: () => sendNotification(form),
    onSuccess: () => {
      toast.success(t("sent"));
      setForm({ title: "", body: "", audience: "all" });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const items = data?.data ?? [];
  const audiences = [
    { value: "all", label: t("all"), icon: Bell },
    { value: "drivers", label: t("drivers"), icon: Car },
    { value: "customers", label: t("customers"), icon: Users },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* الإنشاء */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">{t("compose")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                sendMut.mutate();
              }}
            >
              <div className="space-y-1">
                <Label>{t("notifTitle")}</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>{t("body")}</Label>
                <textarea
                  className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>{t("audience")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {audiences.map((a) => {
                    const Icon = a.icon;
                    return (
                      <button
                        key={a.value}
                        type="button"
                        onClick={() => setForm({ ...form, audience: a.value })}
                        className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors ${
                          form.audience === a.value ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={sendMut.isPending}>
                <Send className="h-4 w-4" />
                {t("send")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* السجل */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">{t("history")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <TableSkeleton cols={2} />
            ) : items.length === 0 ? (
              <EmptyState message={t("empty")} />
            ) : (
              <>
                <div className="space-y-2">
                  {items.map((n) => (
                    <div key={n.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4 text-primary" />
                          <p className="font-medium">{n.title}</p>
                        </div>
                        <Badge variant="secondary">{t(n.audience as any)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                        <span>{t("recipients")}: {formatNumber(n.recipients)}</span>
                        {n.sentBy && <span>{t("sentBy")}: {n.sentBy}</span>}
                        <span>{formatDateTime(n.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Pagination meta={data?.meta ?? null} page={page} onPage={setPage} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
