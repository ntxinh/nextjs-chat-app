"use client";

import { useTranslations } from "next-intl";

export function UnreadSeparator() {
  const t = useTranslations("messages");
  return (
    <li aria-hidden="true" className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-error/40" />
      <span className="shrink-0 font-medium text-error text-xs">{t("newMessages")}</span>
      <div className="h-px flex-1 bg-error/40" />
    </li>
  );
}
