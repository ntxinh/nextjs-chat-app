"use client";

import { ArrowDown } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversation } from "@/features/conversations/hooks";
import type { UiMessage } from "@/features/messages/hooks";
import { useMarkRead, useMessages, usePendingMessages } from "@/features/messages/hooks";
import { MessageBubble } from "@/features/messages/message-bubble";
import { UnreadSeparator } from "@/features/messages/unread-separator";
import { useSession } from "@/lib/auth/client";

const NEAR_BOTTOM_PX = 100;

export function MessageList({ conversationId }: { conversationId: string }) {
  const t = useTranslations("messages");
  const format = useFormatter();
  const { data: session } = useSession();
  const myId = session?.user.id;
  const messages = useMessages(conversationId);
  const pending = usePendingMessages(conversationId);
  const detail = useConversation(conversationId);
  const markRead = useMarkRead(conversationId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const prependRef = useRef<{ height: number; top: number } | null>(null);
  const lastNewestRef = useRef<string | null>(null);
  const markedRef = useRef<string | null>(null);
  const separatorRef = useRef<{ id: string | null; captured: boolean }>({
    id: null,
    captured: false,
  });
  const [jumpVisible, setJumpVisible] = useState(false);

  // Pages come newest-first; flatten then reverse for ascending render order.
  // Optimistic temps (pending/failed) merge at the tail — they live outside
  // the cache so poll refetches can't wipe them.
  const ordered = useMemo(() => {
    const seen = new Set<string>();
    const out: UiMessage[] = [];
    for (const page of [...(messages.data?.pages ?? [])].reverse()) {
      for (const m of [...page.items].reverse()) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          out.push(m);
        }
      }
    }
    for (const m of pending) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        out.push(m);
      }
    }
    return out;
  }, [messages.data, pending]);

  // Unread separator: capture the watermark once on first load — marking read
  // afterwards must not move the divider mid-visit.
  useEffect(() => {
    const sep = separatorRef.current;
    if (sep.captured || !myId || !detail.data || ordered.length === 0) return;
    sep.captured = true;
    if (detail.data.unreadCount === 0) return;
    const watermark = detail.data.members.find((m) => m.id === myId)?.lastReadMessageId;
    if (!watermark) {
      sep.id = ordered[0].id;
      return;
    }
    const idx = ordered.findIndex((m) => m.id === watermark);
    // Watermark above the loaded window or newer than everything → no divider.
    sep.id = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1].id : null;
  }, [myId, detail.data, ordered]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX;
    nearBottomRef.current = near;
    if (near) setJumpVisible(false);
  };

  const loadOlder = async () => {
    const el = scrollRef.current;
    if (el) prependRef.current = { height: el.scrollHeight, top: el.scrollTop };
    await messages.fetchNextPage();
  };

  // Pin to bottom on first load; auto-scroll on new incoming only when the user
  // is already near the bottom, else offer the jump pill. Prepends restore the
  // prior scroll position via the recorded scrollHeight delta.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || ordered.length === 0) return;
    if (prependRef.current) {
      el.scrollTop = el.scrollHeight - prependRef.current.height + prependRef.current.top;
      prependRef.current = null;
    } else if (lastNewestRef.current === null) {
      el.scrollTop = el.scrollHeight;
    }
    const newestId = ordered.at(-1)?.id ?? null;
    if (lastNewestRef.current !== null && newestId !== lastNewestRef.current) {
      if (nearBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      } else {
        setJumpVisible(true);
      }
    }
    lastNewestRef.current = newestId;
  }, [ordered]);

  // Mark read on mount and whenever the newest real message changes (poll batch).
  const newestRealId = ordered.findLast((m) => !m.id.startsWith("pending-"))?.id;
  useEffect(() => {
    if (!newestRealId || markedRef.current === newestRealId) return;
    markedRef.current = newestRealId;
    markRead.mutate(newestRealId);
  }, [newestRealId, markRead]);

  if (messages.isPending) {
    return (
      <div className="flex-1 space-y-3 overflow-hidden p-4">
        {["a", "b", "c", "d"].map((k, i) => (
          <div className={`flex ${i % 2 ? "justify-end" : "justify-start"}`} key={k}>
            <Skeleton className="h-10 w-48 rounded-2xl" />
          </div>
        ))}
      </div>
    );
  }
  if (messages.isError && !messages.data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
        <p className="text-error text-sm">{t("loadFailed")}</p>
        <Button onClick={() => messages.refetch()} size="sm" variant="outline">
          {t("retry")}
        </Button>
      </div>
    );
  }

  const isGroup = detail.data?.type === "group";
  const separatorId = separatorRef.current.id;
  let prev: { day: string; senderId: string } | null = null;
  const rows = ordered.map((m) => {
    const day = new Date(m.createdAt).toDateString();
    const row = {
      m,
      dayChanged: !prev || prev.day !== day,
      showSender: !prev || prev.day !== day || prev.senderId !== m.sender.id,
    };
    prev = { day, senderId: m.sender.id };
    return row;
  });

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        aria-label={t("listLabel")}
        aria-live="polite"
        className="min-h-0 flex-1 overflow-y-auto px-4"
        onScroll={onScroll}
        ref={scrollRef}
        role="log"
      >
        {messages.hasNextPage && (
          <div className="flex justify-center py-2">
            <Button
              disabled={messages.isFetchingNextPage}
              onClick={loadOlder}
              size="sm"
              variant="outline"
            >
              {messages.isFetchingNextPage ? t("loading") : t("loadOlder")}
            </Button>
          </div>
        )}
        {ordered.length === 0 && (
          <p className="py-12 text-center text-muted-foreground text-sm">{t("empty")}</p>
        )}
        <ul className="flex flex-col pb-3">
          {rows.map(({ m, dayChanged, showSender }) => (
            <Fragment key={m.id}>
              {dayChanged && (
                <li className="py-3 text-center text-muted-foreground text-xs">
                  {format.dateTime(new Date(m.createdAt), { dateStyle: "medium" })}
                </li>
              )}
              {separatorId === m.id && <UnreadSeparator />}
              <MessageBubble
                conversationId={conversationId}
                isGroup={isGroup ?? false}
                message={m}
                own={m.sender.id === myId}
                showSender={showSender}
              />
            </Fragment>
          ))}
        </ul>
      </div>
      {jumpVisible && (
        <Button
          className="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-md"
          onClick={() => {
            const el = scrollRef.current;
            if (el) el.scrollTop = el.scrollHeight;
            setJumpVisible(false);
          }}
          size="sm"
        >
          <ArrowDown aria-hidden="true" />
          {t("newMessages")}
        </Button>
      )}
    </div>
  );
}
