import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/features/auth/login-form";
import { Link } from "@/i18n/navigation";

// CSP nonces are per-request — this page must render dynamically or its
// cached HTML carries nonce-free inline scripts that CSP then blocks.
export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await connection();
  setRequestLocale(locale);
  const t = await getTranslations("auth");

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
