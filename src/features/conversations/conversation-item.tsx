"use client";

import { cn } from "cn";
import { useFormatter, useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { ConversationSummary } from "@/features/conversations/hooks";
import { Link, usePathname } from "@/i18n/navigation";

export function conversationName(c: ConversationSummary, unknown: string): string {
  return c.type === "direct" ? (c.otherUser?.name ?? unknown) : (c.name ?? unknown);
}

export function ConversationItem({ conversation }: { conversation: ConversationSummary }) {
  const t = useTranslations("conversations");
  const format = useFormatter();
  const pathname = usePathname();
  const name = conversationName(conversation, t("unknownName"));
  const active = pathname === `/conversations/${conversation.id}`;

  return (
    <Link
      className={cn(
        "flex items-center gap-3 p-3 hover:bg-accent hover:text-accent-foreground",
        active && "bg-accent",
      )}
      href={`/conversations/${conversation.id}`}
    >
      <Avatar>
        {conversation.type === "direct" && conversation.otherUser?.image && (
          <AvatarImage alt="" src={conversation.otherUser.image} />
        )}
        <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-medium text-sm">{name}</span>
          {conversation.preview && (
            <span className="shrink-0 text-muted-foreground text-xs">
              {format.dateTime(new Date(conversation.preview.createdAt), {
                hour: "numeric",
                minute: "numeric",
              })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-muted-foreground text-sm">
            {conversation.preview
              ? `${conversation.preview.senderName}: ${conversation.preview.body}`
              : t("noMessages")}
          </span>
          {conversation.unreadCount > 0 && (
            <Badge
              aria-label={t("unread", { count: conversation.unreadCount })}
              className="shrink-0"
            >
              {conversation.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
