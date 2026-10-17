"use client";

import { create } from "zustand";

type DraftsState = {
  drafts: Record<string, string>;
  setDraft: (conversationId: string, body: string) => void;
  clearDraft: (conversationId: string) => void;
};

export const useDraftsStore = create<DraftsState>((set) => ({
  drafts: {},
  setDraft: (conversationId, body) =>
    set((s) => ({ drafts: { ...s.drafts, [conversationId]: body } })),
  clearDraft: (conversationId) =>
    set((s) => {
      const drafts = { ...s.drafts };
      delete drafts[conversationId];
      return { drafts };
    }),
}));
