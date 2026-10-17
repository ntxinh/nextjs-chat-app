import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { LoginForm } from "@/features/auth/login-form";
import { Link } from "@/i18n/navigation";

export default function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("auth");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="font-semibold text-xl">{t("welcomeBack")}</h1>
        <p className="text-muted-foreground text-sm">{t("signInSubtitle")}</p>
      </div>
      <LoginForm />
      <p className="text-center text-muted-foreground text-sm">
        {t("noAccount")}{" "}
        <Link className="font-medium text-foreground underline" href="/register">
          {t("createAccount")}
        </Link>
      </p>
    </div>
  );
}
