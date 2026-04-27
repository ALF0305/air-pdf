import { create } from "zustand";

/**
 * Preview en vivo de marca de agua. Se renderiza como overlay HTML sobre
 * cada pagina del visor mientras `WatermarkDialog` esta abierto. El render
 * verdadero al PDF lo hace el backend (PDFium/lopdf) al hacer "Aplicar".
 */
export interface WatermarkPreview {
  text: string;
  /** tamano de fuente en puntos PDF */
  fontSize: number;
  /** 0..1 */
  opacity: number;
}

/**
 * Preview en vivo de numeros de pagina. El backend los estampa en
 * centro-inferior, asi que el preview replica esa posicion fija.
 */
export interface PageNumberPreview {
  /** formato con tokens {n} y {total} */
  format: string;
  /** tamano de fuente en puntos PDF */
  fontSize: number;
}

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
  watermarkPreview: WatermarkPreview | null;
  pageNumberPreview: PageNumberPreview | null;
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
  setWatermarkPreview: (v: WatermarkPreview | null) => void;
  setPageNumberPreview: (v: PageNumberPreview | null) => void;
  clearAllPreviews: () => void;
}

// Defensivo: en algunos entornos de test (jsdom con flags raros) el acceso
// a localStorage puede lanzar. No queremos que el store entero falle por
// la persistencia del modo oscuro.
let storedDark = false;
try {
  if (typeof window !== "undefined") {
    storedDark = window.localStorage?.getItem("airpdf-dark") === "1";
  }
} catch {
  /* noop */
}

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
  watermarkPreview: null,
  pageNumberPreview: null,
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
  setWatermarkPreview: (v) => set({ watermarkPreview: v }),
  setPageNumberPreview: (v) => set({ pageNumberPreview: v }),
  clearAllPreviews: () =>
    set({ watermarkPreview: null, pageNumberPreview: null }),
}));
