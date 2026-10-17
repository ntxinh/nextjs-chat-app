"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api-client";
import type { CreateConversationInput } from "@/lib/validation/conversations";
import type { PublicUser } from "@/server/repositories/users";
import type { ConversationDetail, ConversationSummary } from "@/server/services/conversations";

export type { ConversationDetail, ConversationSummary, PublicUser };

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () =>
      apiFetch<{ items: ConversationSummary[]; nextCursor: string | null }>(
        "/api/v1/conversations",
      ),
    refetchInterval: 15_000,
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ["conversations", id],
    queryFn: () => apiFetch<ConversationDetail>(`/api/v1/conversations/${id}`),
  });
}

export function useUserSearch(q: string) {
  return useQuery({
    queryKey: ["users", "search", q.trim()],
    queryFn: () =>
      apiFetch<{ items: PublicUser[] }>(`/api/v1/users?query=${encodeURIComponent(q.trim())}`),
    enabled: q.trim().length >= 2,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (input: CreateConversationInput) =>
      apiFetch<{ conversationId: string }>("/api/v1/conversations", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: ({ conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      router.push(`/conversations/${conversationId}`);
    },
  });
}
