"use client";

import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { conversationName } from "@/features/conversations/conversation-item";
import { useConversation } from "@/features/conversations/hooks";
import { usePresenceLabel } from "@/features/conversations/presence";

export function ConversationHeader({ conversationId }: { conversationId: string }) {
  const t = useTranslations("conversations");
  const { data, isPending, isError } = useConversation(conversationId);

  if (isError) {
    return <h2 className="min-w-0 flex-1 truncate font-semibold text-base">{t("title")}</h2>;
  }
  if (isPending) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Skeleton className="size-9 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    );
  }
  if (!data) return null;

  const name = conversationName(data, t("unknownName"));

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <Avatar>
        {data.type === "direct" && data.otherUser?.image && (
          <AvatarImage alt="" src={data.otherUser.image} />
        )}
        <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <h2 className="truncate font-semibold text-base">{name}</h2>
        {data.type === "group" ? (
          <span className="text-muted-foreground text-xs">
            {t("memberCount", { count: data.members.length })}
          </span>
        ) : (
          <PeerPresence
            lastSeenAt={data.members.find((m) => m.id === data.otherUser?.id)?.lastSeenAt}
          />
        )}
      </div>
    </div>
  );
}

function PeerPresence({ lastSeenAt }: { lastSeenAt?: string | Date | null }) {
  const presence = usePresenceLabel(lastSeenAt);
  if (!presence) return null;
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
      {presence.online && (
        <span aria-hidden="true" className="inline-block size-2 rounded-full bg-success" />
      )}
      {presence.label}
    </span>
  );
}
