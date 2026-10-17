import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { RegisterForm } from "@/features/auth/register-form";
import { Link } from "@/i18n/navigation";

export default function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("auth");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="font-semibold text-xl">{t("createAccount")}</h1>
        <p className="text-muted-foreground text-sm">{t("registerSubtitle")}</p>
      </div>
      <RegisterForm />
      <p className="text-center text-muted-foreground text-sm">
        {t("hasAccount")}{" "}
        <Link className="font-medium text-foreground underline" href="/login">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
