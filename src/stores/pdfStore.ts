import { create } from "zustand";
import type { PdfDocument } from "@/types/pdf";

export type ZoomValue = number | "fit-width" | "fit-page";
export type ViewMode = "single" | "double" | "continuous";

interface PdfStore {
  openTabs: PdfDocument[];
  activeTabId: string | null;
  currentPage: number;
  zoom: ZoomValue;
  viewMode: ViewMode;

  addTab: (doc: PdfDocument) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  setCurrentPage: (page: number) => void;
  setZoom: (zoom: ZoomValue) => void;
  setViewMode: (mode: ViewMode) => void;
  getActiveTab: () => PdfDocument | null;
}

export const usePdfStore = create<PdfStore>((set, get) => ({
  openTabs: [],
  activeTabId: null,
  currentPage: 0,
  zoom: 1.0,
  viewMode: "single",

  addTab: (doc) => {
    const existing = get().openTabs.find((t) => t.path === doc.path);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }
    set((s) => ({
      openTabs: [...s.openTabs, doc],
      activeTabId: doc.id,
      currentPage: 0,
    }));
  },

  closeTab: (id) => {
    set((s) => {
      const newTabs = s.openTabs.filter((t) => t.id !== id);
      const newActive =
        s.activeTabId === id
          ? newTabs[newTabs.length - 1]?.id ?? null
          : s.activeTabId;
      return { openTabs: newTabs, activeTabId: newActive };
    });
  },

  setActiveTab: (id) => set({ activeTabId: id, currentPage: 0 }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setZoom: (zoom) => set({ zoom }),
  setViewMode: (mode) => set({ viewMode: mode }),
  getActiveTab: () => {
    const s = get();
    return s.openTabs.find((t) => t.id === s.activeTabId) ?? null;
  },
}));
