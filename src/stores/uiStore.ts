import { create } from "zustand";

interface UiStore {
  readingMode: boolean;
  sidebarVisible: boolean;
  searchDialogOpen: boolean;
  mergeDialogOpen: boolean;
  splitExtractDialog: "split" | "extract" | null;
  refreshKey: number;
  setReadingMode: (v: boolean) => void;
  toggleReadingMode: () => void;
  setSidebarVisible: (v: boolean) => void;
  toggleSidebar: () => void;
  setSearchDialogOpen: (v: boolean) => void;
  setMergeDialogOpen: (v: boolean) => void;
  setSplitExtractDialog: (v: "split" | "extract" | null) => void;
  bumpRefresh: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  readingMode: false,
  sidebarVisible: true,
  searchDialogOpen: false,
  mergeDialogOpen: false,
  splitExtractDialog: null,
  refreshKey: 0,
  setReadingMode: (v) => set({ readingMode: v }),
  toggleReadingMode: () => set((s) => ({ readingMode: !s.readingMode })),
  setSidebarVisible: (v) => set({ sidebarVisible: v }),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  setSearchDialogOpen: (v) => set({ searchDialogOpen: v }),
  setMergeDialogOpen: (v) => set({ mergeDialogOpen: v }),
  setSplitExtractDialog: (v) => set({ splitExtractDialog: v }),
  bumpRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
