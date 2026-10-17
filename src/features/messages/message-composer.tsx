"use client";

import { SendHorizonal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useSendMessage } from "@/features/messages/hooks";
import { useSession } from "@/lib/auth/client";
import { useDraftsStore } from "@/stores/drafts";

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const t = useTranslations("messages");
  const { data: session } = useSession();
  const draft = useDraftsStore((s) => s.drafts[conversationId] ?? "");
  const setDraft = useDraftsStore((s) => s.setDraft);
  const clearDraft = useDraftsStore((s) => s.clearDraft);
  const send = useSendMessage(conversationId);
  // Dedup key is bound to the draft's text: resending the same body after a
  // failure reuses the key (server dedups), any edit mints a new one.
  const lastAttemptRef = useRef<{ clientMessageId: string; body: string } | null>(null);

  const submit = () => {
    const body = draft.trim();
    if (!body || send.isPending || !session?.user) return;
    const attempt = lastAttemptRef.current;
    const clientMessageId =
      attempt && attempt.body === body ? attempt.clientMessageId : crypto.randomUUID();
    lastAttemptRef.current = { clientMessageId, body };
    send.mutate(
      {
        body,
        clientMessageId,
        sender: { id: session.user.id, name: session.user.name, image: session.user.image ?? null },
      },
      {
        onSuccess: () => {
          lastAttemptRef.current = null;
          // Don't clobber text typed while the send was in flight.
          if ((useDraftsStore.getState().drafts[conversationId] ?? "").trim() === body) {
            clearDraft(conversationId);
          }
        },
      },
    );
  };

  return (
    <div className="border-border border-t p-3">
      <div className="flex items-end gap-2">
        <textarea
          aria-label={t("placeholder")}
          className="field-sizing-content max-h-36 min-h-10 flex-1 resize-none rounded-2xl border border-input bg-background px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(e) => setDraft(conversationId, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={t("placeholder")}
          rows={1}
          value={draft}
        />
        <Button
          aria-label={t("send")}
          className="size-10 shrink-0"
          disabled={!draft.trim() || send.isPending}
          onClick={submit}
          size="icon"
        >
          <SendHorizonal aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
