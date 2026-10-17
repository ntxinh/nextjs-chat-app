"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ConversationItem, conversationName } from "@/features/conversations/conversation-item";
import { useConversations } from "@/features/conversations/hooks";

export function ConversationList({ onNewChat }: { onNewChat: () => void }) {
  const t = useTranslations("conversations");
  const tn = useTranslations("nav");
  const [query, setQuery] = useState("");
  const { data, isPending, isError, refetch } = useConversations();

  const q = query.trim().toLowerCase();
  const items = (data?.items ?? []).filter(
    (c) => !q || conversationName(c, t("unknownName")).toLowerCase().includes(q),
  );

  return (
    <>
      <div className="px-3 pb-3">
        <Input
          aria-label={tn("search")}
          className="h-11"
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tn("searchPlaceholder")}
          type="search"
          value={query}
        />
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {isPending ? (
          <div aria-busy="true">
            {["s1", "s2", "s3", "s4", "s5", "s6"].map((k) => (
              <div className="flex items-center gap-3 p-3" key={k}>
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="m-3 flex flex-col items-center gap-2 rounded-md border border-error/20 bg-error/10 p-4">
            <p className="text-error text-sm">{t("loadFailed")}</p>
            <Button onClick={() => refetch()} size="sm" variant="outline">
              {t("retry")}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-muted-foreground">
            <Search aria-hidden="true" className="size-6" />
            <p className="text-sm">{data?.items.length ? t("noMatch") : t("empty")}</p>
            {!data?.items.length && (
              <Button className="mt-1" onClick={onNewChat} size="sm">
                {t("newConversation")}
              </Button>
            )}
          </div>
        ) : (
          <nav aria-label={tn("chats")}>
            <ul>
              {items.map((c) => (
                <li key={c.id}>
                  <ConversationItem conversation={c} />
                </li>
              ))}
            </ul>
          </nav>
        )}
      </ScrollArea>
    </>
  );
}
