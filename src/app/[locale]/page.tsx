import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("common");
  return (
    <main className="p-4">
      <header className="flex items-center justify-between">
        <h1 className="font-semibold text-lg">{t("appName")}</h1>
        <ThemeToggle />
      </header>
    </main>
  );
}
