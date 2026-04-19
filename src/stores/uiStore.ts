import { create } from "zustand";

interface UiStore {
  readingMode: boolean;
  sidebarVisible: boolean;
  searchDialogOpen: boolean;
  setReadingMode: (v: boolean) => void;
  toggleReadingMode: () => void;
  setSidebarVisible: (v: boolean) => void;
  toggleSidebar: () => void;
  setSearchDialogOpen: (v: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  readingMode: false,
  sidebarVisible: true,
  searchDialogOpen: false,
  setReadingMode: (v) => set({ readingMode: v }),
  toggleReadingMode: () => set((s) => ({ readingMode: !s.readingMode })),
  setSidebarVisible: (v) => set({ sidebarVisible: v }),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  setSearchDialogOpen: (v) => set({ searchDialogOpen: v }),
}));
