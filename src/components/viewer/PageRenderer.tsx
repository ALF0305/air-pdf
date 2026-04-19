import { useEffect, useState } from "react";
import { renderPage } from "@/lib/tauri";

interface Props {
  path: string;
  pageIndex: number;
  scale: number;
  width: number;
  height: number;
}

export function PageRenderer({ path, pageIndex, scale, width, height }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    setLoading(true);
    renderPage(path, pageIndex, scale)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setImageUrl(url);
      })
      .catch((e) => {
        if (!cancelled) console.error("render failed", e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [path, pageIndex, scale]);

  return (
    <div
      className="relative bg-white shadow-md mx-auto my-4"
      style={{ width: width * scale, height: height * scale }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
          Cargando pagina {pageIndex + 1}...
        </div>
      )}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={`Pagina ${pageIndex + 1}`}
          className="w-full h-full object-contain"
        />
      )}
    </div>
  );
}
