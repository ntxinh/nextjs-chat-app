"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useConversation } from "@/features/conversations/hooks";
import { MessageComposer } from "@/features/messages/message-composer";
import { MessageList } from "@/features/messages/message-list";
import { Link } from "@/i18n/navigation";

export function ConversationView({ conversationId }: { conversationId: string }) {
  const t = useTranslations("conversations");
  const { isError } = useConversation(conversationId);

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
        <p className="text-error text-sm">{t("notFound")}</p>
        <Button asChild size="sm" variant="outline">
          <Link href="/">{t("backToChats")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <MessageList conversationId={conversationId} />
      <MessageComposer conversationId={conversationId} />
    </>
  );
}
