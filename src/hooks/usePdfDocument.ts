import { useEffect, useState } from "react";
import { getPagesInfo } from "@/lib/tauri";
import { useUiStore } from "@/stores/uiStore";
import type { PdfPage } from "@/types/pdf";

export function usePdfDocument(path: string | null) {
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshKey = useUiStore((s) => s.refreshKey);

  useEffect(() => {
    if (!path) {
      setPages([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPagesInfo(path)
      .then((p) => {
        if (!cancelled) setPages(p);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, refreshKey]);

  return { pages, loading, error };
}
