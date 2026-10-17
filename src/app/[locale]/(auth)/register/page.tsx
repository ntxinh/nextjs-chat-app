import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RegisterForm } from "@/features/auth/register-form";
import { Link } from "@/i18n/navigation";

// CSP nonces are per-request — this page must render dynamically or its
// cached HTML carries nonce-free inline scripts that CSP then blocks.
export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await connection();
  setRequestLocale(locale);
  const t = await getTranslations("auth");

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
