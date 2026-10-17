import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { ConversationView } from "@/features/conversations/conversation-view";

export default function ConversationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = use(params);
  setRequestLocale(locale);
  return <ConversationView conversationId={id} />;
}
