"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Car, Loader2 } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { LangSwitcher } from "@/components/layout/lang-switcher";
import { login } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore, type Profile } from "@/lib/auth-store";

export default function LoginPage() {
  const t = useTranslations("auth");
  const tApp = useTranslations("app");
  const router = useRouter();
  const setProfile = useAuthStore((s) => s.setProfile);
  const [loading, setLoading] = React.useState(false);

  const schema = z.object({
    email: z.string().email(t("invalidEmail")),
    password: z.string().min(1, t("passwordRequired")),
  });
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "admin@halago.com", password: "password" } });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const profile = await login(values.email, values.password);
      setProfile(profile as Profile);
      toast.success(t("loginSuccess"));
      router.replace("/");
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent p-4">
      <div className="absolute top-4 end-4">
        <LangSwitcher />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Car className="h-7 w-7" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">{tApp("name")}</h1>
            <p className="text-sm text-muted-foreground">{tApp("subtitle")}</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input id="email" type="email" dir="ltr" placeholder="admin@halago.com" autoComplete="username" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <Input id="password" type="password" dir="ltr" placeholder="••••••••" autoComplete="current-password" {...register("password")} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("loginButton")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">{t("demoHint")}</p>
      </div>
    </div>
  );
}
