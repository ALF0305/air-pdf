import { create } from "zustand";

export type ToolDialog =
  | null
  | "metadata"
  | "compress"
  | "exportImages"
  | "imagesToPdf"
  | "watermark"
  | "pageNumbers"
  | "goto"
  | "crop"
  | "stamp"
  | "about"
  | "shortcuts"
  | "stampPreset"
  | "password"
  | "bookmarks"
  | "comparePdf"
  | "versions"
  | "formFields"
  | "ocr"
  | "ai"
  | "addText";

interface UiStore {
  readingMode: boolean;
  sidebarVisible: boolean;
  searchDialogOpen: boolean;
  mergeDialogOpen: boolean;
  splitExtractDialog: "split" | "extract" | null;
  toolDialog: ToolDialog;
  refreshKey: number;
  darkMode: boolean;
  presentationMode: boolean;
  setReadingMode: (v: boolean) => void;
  toggleReadingMode: () => void;
  setSidebarVisible: (v: boolean) => void;
  toggleSidebar: () => void;
  setSearchDialogOpen: (v: boolean) => void;
  setMergeDialogOpen: (v: boolean) => void;
  setSplitExtractDialog: (v: "split" | "extract" | null) => void;
  setToolDialog: (v: ToolDialog) => void;
  bumpRefresh: () => void;
  toggleDarkMode: () => void;
  togglePresentation: () => void;
}

const storedDark =
  typeof window !== "undefined" &&
  window.localStorage?.getItem("airpdf-dark") === "1";

export const useUiStore = create<UiStore>((set) => ({
  readingMode: false,
  sidebarVisible: true,
  searchDialogOpen: false,
  mergeDialogOpen: false,
  splitExtractDialog: null,
  toolDialog: null,
  refreshKey: 0,
  darkMode: storedDark,
  presentationMode: false,
  setReadingMode: (v) => set({ readingMode: v }),
  toggleReadingMode: () => set((s) => ({ readingMode: !s.readingMode })),
  setSidebarVisible: (v) => set({ sidebarVisible: v }),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  setSearchDialogOpen: (v) => set({ searchDialogOpen: v }),
  setMergeDialogOpen: (v) => set({ mergeDialogOpen: v }),
  setSplitExtractDialog: (v) => set({ splitExtractDialog: v }),
  setToolDialog: (v) => set({ toolDialog: v }),
  bumpRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode;
      try {
        window.localStorage?.setItem("airpdf-dark", next ? "1" : "0");
      } catch {
        /* noop */
      }
      return { darkMode: next };
    }),
  togglePresentation: () =>
    set((s) => ({
      presentationMode: !s.presentationMode,
      readingMode: !s.presentationMode ? true : s.readingMode,
    })),
}));
