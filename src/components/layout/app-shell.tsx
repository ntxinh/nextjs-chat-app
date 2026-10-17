"use client";

import { cn } from "cn";
import { ArrowLeft, PanelRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { DetailsPanel } from "@/components/layout/details-panel";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { ConversationHeader } from "@/features/conversations/conversation-header";
import { ConversationDetails } from "@/features/conversations/details-panel";
import { Link, usePathname } from "@/i18n/navigation";
import { useUiStore } from "@/stores/ui";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { detailsOpen, toggleDetails, closeDetails } = useUiStore();
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tv = useTranslations("conversations");

  const inConversation = pathname.startsWith("/conversations/");
  const conversationId = inConversation ? pathname.split("/")[2] : null;
  const inSubPage = !inConversation && pathname !== "/";

  return (
    <div
      className={cn(
        "grid h-dvh grid-cols-1 overflow-hidden",
        "md:grid-cols-[20rem_1fr]",
        detailsOpen ? "lg:grid-cols-[24rem_1fr_20rem]" : "lg:grid-cols-[24rem_1fr]",
      )}
    >
      <div className={cn("min-h-0 min-w-0", (inConversation || inSubPage) && "max-md:hidden")}>
        <Sidebar />
      </div>
      <main
        className={cn(
          "flex min-h-0 min-w-0 flex-col",
          inConversation || inSubPage ? "flex" : "hidden md:flex",
        )}
      >
        <header className="flex items-center gap-2 border-border border-b p-3">
          {(inConversation || inSubPage) && (
            <Button
              aria-label={tv("backToChats")}
              asChild
              className="size-11 md:hidden"
              size="icon"
              variant="ghost"
            >
              <Link href="/">
                <ArrowLeft aria-hidden="true" />
              </Link>
            </Button>
          )}
          {inConversation && conversationId ? (
            <ConversationHeader conversationId={conversationId} />
          ) : (
            <h2 className="min-w-0 flex-1 truncate font-semibold text-base">
              {inSubPage ? t("settings") : tv("emptyTitle")}
            </h2>
          )}
          <Button
            aria-label={t("details")}
            aria-pressed={detailsOpen}
            className="hidden size-11 lg:inline-flex"
            onClick={toggleDetails}
            size="icon"
            variant="ghost"
          >
            <PanelRight aria-hidden="true" />
          </Button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </main>
      {detailsOpen && (
        <DetailsPanel onClose={closeDetails}>
          {conversationId ? <ConversationDetails conversationId={conversationId} /> : null}
        </DetailsPanel>
      )}
    </div>
  );
}
