"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function DetailsPanel({
  onClose,
  children,
}: {
  onClose: () => void;
  children?: React.ReactNode;
}) {
  const t = useTranslations("conversations");

  return (
    <aside
      aria-label={t("details")}
      className="hidden h-full w-80 flex-col border-border border-l lg:flex"
    >
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
      <ScrollArea className="min-h-0 flex-1">
        {children ?? <p className="p-4 text-muted-foreground text-sm">{t("detailsEmpty")}</p>}
      </ScrollArea>
    </aside>
  );
}
