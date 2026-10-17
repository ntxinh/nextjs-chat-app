"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function DetailsPanel({ onClose }: { onClose: () => void }) {
  const t = useTranslations("conversations");

  return (
    <aside className="hidden h-full w-80 flex-col border-border border-l lg:flex">
      <div className="flex items-center justify-between border-border border-b p-3">
        <h2 className="font-semibold text-base">{t("details")}</h2>
        <Button
          aria-label={t("closeDetails")}
          className="size-11"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      <div className="flex-1 p-4">
        <p className="text-muted-foreground text-sm">{t("detailsEmpty")}</p>
      </div>
    </aside>
  );
}
