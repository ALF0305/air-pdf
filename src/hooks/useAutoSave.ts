import { useEffect, useRef } from "react";
import { usePdfStore } from "@/stores/pdfStore";
import { useAnnotationStore } from "@/stores/annotationStore";
import { saveVersion } from "@/lib/tauri";

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Periodic version snapshot of the active PDF.
 * Creates a .airpdf-history entry every 5 minutes if annotations changed
 * since the last snapshot. Defensive backup — annotations already persist
 * synchronously on each mutation via the sidecar file.
 */
export function useAutoSave() {
  const lastSavedCount = useRef<number>(-1);
  const lastSavedPath = useRef<string | null>(null);

  useEffect(() => {
    const tick = async () => {
      const tab = usePdfStore.getState().getActiveTab();
      if (!tab) return;
      const { annotations, pdfPath } = useAnnotationStore.getState();
      if (!pdfPath || pdfPath !== tab.path) return;

      // Skip if nothing changed since last snapshot for this path
      const changed =
        pdfPath !== lastSavedPath.current ||
        annotations.length !== lastSavedCount.current;
      if (!changed) return;

      try {
        await saveVersion(tab.path);
        lastSavedPath.current = pdfPath;
        lastSavedCount.current = annotations.length;
      } catch (e) {
        console.error("auto-save version failed", e);
      }
    };

    const id = window.setInterval(tick, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);
}
