"use client";

import { create } from "zustand";

type UiState = {
  detailsOpen: boolean;
  toggleDetails: () => void;
  closeDetails: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  detailsOpen: false,
  toggleDetails: () => set((s) => ({ detailsOpen: !s.detailsOpen })),
  closeDetails: () => set({ detailsOpen: false }),
}));
