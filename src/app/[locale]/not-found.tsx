import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("common");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="text-muted-foreground">{t("error")}</p>
      <Link href="/" className="text-primary underline">
        {t("view")}
      </Link>
    </div>
  );
}
