import { create } from "zustand";
import type { Annotation } from "@/types/annotations";
import * as api from "@/lib/tauri";

export type Tool =
  | "select"
  | "highlight"
  | "underline"
  | "strikethrough"
  | "note"
  | "pen"
  | "stamp"
  | "rect"
  | "circle"
  | "arrow"
  | "freetext"
  | "image";

interface AnnotationStore {
  pdfPath: string | null;
  annotations: Annotation[];
  activeTool: Tool;
  activeColor: string;
  activeCategory: string;
  selectedId: string | null;

  load: (pdfPath: string) => Promise<void>;
  add: (
    partial: Omit<Annotation, "id" | "createdAt" | "updatedAt">
  ) => Promise<void>;
  update: (a: Annotation) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  setTool: (t: Tool) => void;
  setColor: (c: string) => void;
  setCategory: (c: string) => void;
  selectAnnotation: (id: string | null) => void;
}

export const useAnnotationStore = create<AnnotationStore>((set, get) => ({
  pdfPath: null,
  annotations: [],
  activeTool: "select",
  activeColor: "#FFEB3B",
  activeCategory: "Importante",
  selectedId: null,

  load: async (pdfPath) => {
    try {
      const sidecar = await api.loadAnnotations(pdfPath);
      set({ pdfPath, annotations: sidecar.annotations, selectedId: null });
    } catch (e) {
      console.error("load annotations failed", e);
      set({ pdfPath, annotations: [], selectedId: null });
    }
  },

  add: async (partial) => {
    const path = get().pdfPath;
    if (!path) return;
    const now = new Date().toISOString();
    const annotation: Annotation = {
      ...partial,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    try {
      const sidecar = await api.addAnnotation(path, annotation);
      set({ annotations: sidecar.annotations });
    } catch (e) {
      console.error("add annotation failed", e);
    }
  },

  update: async (a) => {
    const path = get().pdfPath;
    if (!path) return;
    const updated = { ...a, updatedAt: new Date().toISOString() };
    try {
      const sidecar = await api.updateAnnotation(path, updated);
      set({ annotations: sidecar.annotations });
    } catch (e) {
      console.error("update annotation failed", e);
    }
  },

  remove: async (id) => {
    const path = get().pdfPath;
    if (!path) return;
    try {
      const sidecar = await api.deleteAnnotation(path, id);
      set({ annotations: sidecar.annotations, selectedId: null });
    } catch (e) {
      console.error("remove annotation failed", e);
    }
  },

  clear: async () => {
    const path = get().pdfPath;
    if (!path) return;
    try {
      const sidecar = await api.clearAnnotations(path);
      set({ annotations: sidecar.annotations, selectedId: null });
    } catch (e) {
      console.error("clear annotations failed", e);
    }
  },

  setTool: (activeTool) => set({ activeTool }),
  setColor: (activeColor) => set({ activeColor }),
  setCategory: (activeCategory) => set({ activeCategory }),
  selectAnnotation: (selectedId) => set({ selectedId }),
}));
