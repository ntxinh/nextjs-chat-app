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
    queryKey: ["conversations", "detail", id],
    queryFn: () => apiFetch<ConversationDetail>(`/api/v1/conversations/${id}`),
    refetchInterval: 15_000, // members' lastSeenAt goes stale otherwise
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

export function useUpdateConversation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<ConversationDetail>(`/api/v1/conversations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),
    onSuccess: (detail) => {
      queryClient.setQueryData(["conversations", "detail", id], detail);
      queryClient.invalidateQueries({ queryKey: ["conversations"], exact: true });
    },
  });
}

export function useAddMember(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/api/v1/conversations/${id}/members`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", "detail", id] });
    },
  });
}

export function useLeaveConversation(id: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => apiFetch(`/api/v1/conversations/${id}/members/me`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["conversations", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"], exact: true });
      router.push("/");
    },
  });
}
