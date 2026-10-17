"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<(typeof routing.locales)[number], string> = {
  en: "English",
  vi: "Tiếng Việt",
};

export function PreferencesSection() {
  const t = useTranslations("settings");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="font-medium text-sm">{t("language")}</span>
          <span className="text-muted-foreground text-xs">
            {LOCALE_LABELS[locale as (typeof routing.locales)[number]] ?? locale}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label={t("language")} className="size-11" size="icon" variant="outline">
              <Languages aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              onValueChange={(value) =>
                router.replace(pathname, { locale: value as (typeof routing.locales)[number] })
              }
              value={locale}
            >
              {routing.locales.map((l) => (
                <DropdownMenuRadioItem className="min-h-11" key={l} value={l}>
                  {LOCALE_LABELS[l]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="font-medium text-sm">{t("theme")}</span>
        <ThemeToggle />
      </div>
    </div>
  );
}
