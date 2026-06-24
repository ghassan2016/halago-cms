"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

import { changePassword } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InfoRow } from "@/components/detail-helpers";

export default function AccountPage() {
  const t = useTranslations("account");
  const ta = useTranslations("admins");
  const profile = useAuthStore((s) => s.profile);
  const [form, setForm] = React.useState({ current: "", next: "", confirm: "" });

  const mutation = useMutation({
    mutationFn: () => changePassword(form.current, form.next),
    onSuccess: () => {
      toast.success(t("changed"));
      setForm({ current: "", next: "", confirm: "" });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.next !== form.confirm) {
      toast.error(t("mismatch"));
      return;
    }
    mutation.mutate();
  }

  const roleLabel = profile?.role ? ta(`role_${profile.role}` as any) : "—";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("info")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={profile?.name || "A"} className="h-16 w-16 text-lg" />
              <div>
                <p className="text-lg font-bold">{profile?.name}</p>
                <p className="text-sm text-muted-foreground" dir="ltr">{profile?.email}</p>
              </div>
            </div>
            <div>
              <InfoRow label={t("name")} value={profile?.name} />
              <InfoRow label={t("email")} value={<span dir="ltr">{profile?.email}</span>} />
              <InfoRow label={t("role")} value={roleLabel} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("changePassword")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submit}>
              <div className="space-y-1">
                <Label>{t("current")}</Label>
                <Input type="password" dir="ltr" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>{t("next")}</Label>
                <Input type="password" dir="ltr" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>{t("confirm")}</Label>
                <Input type="password" dir="ltr" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
              </div>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t("save")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
