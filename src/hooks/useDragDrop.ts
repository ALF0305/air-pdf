import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

interface DragDropPayload {
  paths?: string[];
  type?: string;
}

export function useDragDrop(onFiles: (paths: string[]) => void) {
  useEffect(() => {
    const unlistenPromise = listen<DragDropPayload | string[]>(
      "tauri://drag-drop",
      (event) => {
        const payload = event.payload as DragDropPayload;
        const paths = Array.isArray(event.payload)
          ? (event.payload as string[])
          : payload?.paths ?? [];
        if (Array.isArray(paths) && paths.length > 0) {
          const pdfs = paths.filter((p) => p.toLowerCase().endsWith(".pdf"));
          if (pdfs.length > 0) onFiles(pdfs);
        }
      }
    );
    return () => {
      unlistenPromise.then((unlisten) => unlisten()).catch(() => {});
    };
  }, [onFiles]);
}
