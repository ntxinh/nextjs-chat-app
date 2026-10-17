"use client";

import type { InfiniteData } from "@tanstack/react-query";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { ApiClientError, apiFetch } from "@/lib/api-client";

/** Wire shape of GET /conversations/{id}/messages — dates arrive as ISO strings. */
export type Message = {
  id: string;
  conversationId: string;
  sender: { id: string; name: string; image: string | null };
  body: string;
  createdAt: string;
  editedAt: string | null;
  deleted: boolean;
  /** Present on optimistic temp messages; the server DTO never sends it. */
  clientMessageId?: string;
};

export type UiMessage = Message & { pending?: boolean; failed?: boolean };

type MessagePage = { items: UiMessage[]; nextCursor: string | null };
export type MessagesData = InfiniteData<MessagePage>;

export const messagesKey = (conversationId: string) => ["messages", conversationId] as const;

const fetchPage = (conversationId: string, cursor?: string) =>
  apiFetch<{ items: Message[]; nextCursor: string | null }>(
    `/api/v1/conversations/${conversationId}/messages?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
  );

/**
 * History pages + polling in one query. TanStack v5's refetchInterval refetches
 * every loaded page, so new messages arrive via normal refetch — no separate
 * page-1 poll/merge needed (a head-page poll would have to dedup by id and
 * could gap when >50 messages land between ticks).
 */
export function useMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: messagesKey(conversationId),
    queryFn: ({ pageParam }) => fetchPage(conversationId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor,
    refetchInterval: 5_000,
    // 404/403 are terminal — don't sit through retry backoff before isError.
    retry: (count, error) => !(error instanceof ApiClientError && error.status < 500) && count < 2,
  });
}

export type SendVars = {
  body: string;
  clientMessageId: string;
  sender: { id: string; name: string; image: string | null };
};

/** Map one message by id — `update` returns the replacement or null to remove it. */

function mapMessages(
  data: MessagesData,
  id: string,
  update: (m: UiMessage) => UiMessage | null,
): MessagesData {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.flatMap((m) => {
        if (m.id !== id) return [m];
        const next = update(m);
        return next ? [next] : [];
      }),
    })),
  };
}

const tempId = (clientMessageId: string) => `pending-${clientMessageId}`;

// --- Optimistic send buffer ------------------------------------------------
// Temps live OUTSIDE the infinite-query cache: every refetch (poll tick,
// post-send invalidation) replaces the cache with server truth, which would
// wipe pending/failed bubbles mid-flight. MessageList merges this list in.
const pendingTemps = new Map<string, UiMessage[]>();
const pendingListeners = new Set<() => void>();
let pendingVersion = 0;

const EMPTY_TEMPS: UiMessage[] = [];
const getPending = (conversationId: string) => pendingTemps.get(conversationId) ?? EMPTY_TEMPS;

function setPending(conversationId: string, temps: UiMessage[]) {
  if (temps.length) pendingTemps.set(conversationId, temps);
  else pendingTemps.delete(conversationId);
  pendingVersion++;
  for (const l of pendingListeners) l();
}

/** Optimistic (pending/failed) messages for a conversation, newest last. */
export function usePendingMessages(conversationId: string): UiMessage[] {
  useSyncExternalStore(
    (cb) => {
      pendingListeners.add(cb);
      return () => pendingListeners.delete(cb);
    },
    () => pendingVersion,
    () => pendingVersion, // server snapshot — without it SSR bails out entirely
  );
  return getPending(conversationId);
}

/** Replace a message by id, or prepend to page 1 when absent. */
function upsertMessage(data: MessagesData, message: UiMessage): MessagesData {
  if (data.pages.some((p) => p.items.some((m) => m.id === message.id))) {
    return mapMessages(data, message.id, () => message);
  }
  const [first, ...rest] = data.pages;
  return { ...data, pages: [{ ...first, items: [message, ...first.items] }, ...rest] };
}
export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    // UI owns retries ("Retry" button re-mutates) — TanStack's default 3x
    // backoff would leave the bubble stuck on "sending…" for ~10s.
    retry: 0,
    mutationFn: ({ body, clientMessageId }: SendVars) =>
      apiFetch<Message>(`/api/v1/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body, clientMessageId }),
      }),
    onMutate: ({ body, clientMessageId, sender }) => {
      queryClient.cancelQueries({ queryKey: messagesKey(conversationId) });
      const temp: UiMessage = {
        id: tempId(clientMessageId),
        clientMessageId,
        conversationId,
        sender,
        body,
        createdAt: new Date().toISOString(),
        editedAt: null,
        deleted: false,
        pending: true,
      };
      // A retry for the same clientMessageId just re-flags the temp pending.
      setPending(conversationId, [
        ...getPending(conversationId).filter((m) => m.id !== temp.id),
        temp,
      ]);
    },
    onSuccess: (message, { clientMessageId }) => {
      setPending(
        conversationId,
        getPending(conversationId).filter((m) => m.id !== tempId(clientMessageId)),
      );
      // The message usually isn't in the cache yet — insert it. (If a poll
      // landed it first, upsertMessage just replaces by id.)
      queryClient.setQueryData<MessagesData>(messagesKey(conversationId), (old) =>
        old ? upsertMessage(old, message) : old,
      );
    },
    onError: (_e, { clientMessageId }) => {
      // Failed bubble stays with a retry affordance (DESIGN.md) instead of a
      // rollback+toast — the draft is never dropped.
      const id = tempId(clientMessageId);
      setPending(
        conversationId,
        getPending(conversationId).map((m) =>
          m.id === id ? { ...m, pending: false, failed: true } : m,
        ),
      );
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: messagesKey(conversationId) });
      queryClient.invalidateQueries({ queryKey: ["conversations"], exact: true });
    },
  });
}

export function useEditMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, body }: { messageId: string; body: string }) =>
      apiFetch<Message>(`/api/v1/messages/${messageId}`, {
        method: "PATCH",
        body: JSON.stringify({ body }),
      }),
    onSuccess: (message) => {
      queryClient.setQueryData<MessagesData>(messagesKey(conversationId), (old) =>
        old ? mapMessages(old, message.id, () => message) : old,
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: messagesKey(conversationId) }),
  });
}

export function useDeleteMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) =>
      apiFetch<Message>(`/api/v1/messages/${messageId}`, { method: "DELETE" }),
    onSuccess: (message) => {
      queryClient.setQueryData<MessagesData>(messagesKey(conversationId), (old) =>
        old ? mapMessages(old, message.id, () => message) : old,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: messagesKey(conversationId) });
      queryClient.invalidateQueries({ queryKey: ["conversations"], exact: true });
    },
  });
}

export function useMarkRead(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) =>
      apiFetch(`/api/v1/conversations/${conversationId}/read`, {
        method: "POST",
        body: JSON.stringify({ messageId }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations"], exact: true }),
  });
}
