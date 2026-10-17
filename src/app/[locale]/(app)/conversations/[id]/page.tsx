import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

export default function ConversationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("conversations");
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <p className="text-muted-foreground text-sm">{t("stub")}</p>
    </div>
  );
}
