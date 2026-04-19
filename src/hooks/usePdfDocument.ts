import { useEffect, useState } from "react";
import { getPagesInfo } from "@/lib/tauri";
import type { PdfPage } from "@/types/pdf";

export function usePdfDocument(path: string | null) {
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [path]);

  return { pages, loading, error };
}
