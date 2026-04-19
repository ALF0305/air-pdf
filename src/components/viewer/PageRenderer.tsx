import { useEffect, useRef, useState } from "react";
import { renderPage } from "@/lib/tauri";
import { AnnotationLayer } from "@/components/annotations/AnnotationLayer";
import { StampPicker, type Stamp } from "@/components/annotations/StampPicker";
import { useAnnotationStore } from "@/stores/annotationStore";
import { useUiStore } from "@/stores/uiStore";

interface Props {
  path: string;
  pageIndex: number;
  scale: number;
  width: number;
  height: number;
  /** If true, defers render until element is near viewport (IntersectionObserver). */
  lazy?: boolean;
}

/** Oversample factor for crisp text on HiDPI screens.
 *  Render at scale * OVERSAMPLE, display at scale. Browser downsamples = crisp. */
const OVERSAMPLE = 2;

export function PageRenderer({
  path,
  pageIndex,
  scale,
  width,
  height,
  lazy = false,
}: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shouldRender, setShouldRender] = useState(!lazy);
  const [stampPickerOpen, setStampPickerOpen] = useState(false);
  const [pendingStampPos, setPendingStampPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const tool = useAnnotationStore((s) => s.activeTool);
  const add = useAnnotationStore((s) => s.add);
  const refreshKey = useUiStore((s) => s.refreshKey);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy-load: only render when near viewport
  useEffect(() => {
    if (!lazy || shouldRender || !containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldRender(true);
            observer.disconnect();
          }
        });
      },
      {
        root: null,
        rootMargin: "800px",
        threshold: 0.01,
      }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [lazy, shouldRender]);

  useEffect(() => {
    if (!shouldRender) return;
    let cancelled = false;
    let url: string | null = null;
    setLoading(true);
    // Oversample for crisp text on HiDPI
    const renderScale = scale * OVERSAMPLE;
    renderPage(path, pageIndex, renderScale)
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
  }, [path, pageIndex, scale, shouldRender, refreshKey]);

  const handleStampAreaClick = (e: React.MouseEvent) => {
    if (tool !== "stamp") return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPendingStampPos({
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    });
    setStampPickerOpen(true);
  };

  const handleStampPick = async (stamp: Stamp) => {
    if (!pendingStampPos) return;
    await add({
      type: "stamp",
      page: pageIndex,
      rect: [
        pendingStampPos.x,
        pendingStampPos.y,
        pendingStampPos.x + 150,
        pendingStampPos.y + 40,
      ],
      color: stamp.bg,
      category: "Sello",
      author: "Alfredo",
      text: stamp.label,
      data: { stampId: stamp.id, fgColor: stamp.color },
    });
    setPendingStampPos(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-white shadow-md mx-auto my-4"
      style={{ width: width * scale, height: height * scale }}
      onClick={tool === "stamp" ? handleStampAreaClick : undefined}
    >
      {(loading || !shouldRender) && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
          {!shouldRender
            ? `Página ${pageIndex + 1}`
            : `Cargando página ${pageIndex + 1}...`}
        </div>
      )}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={`Pagina ${pageIndex + 1}`}
          className="w-full h-full object-contain"
          draggable={false}
        />
      )}
      <AnnotationLayer
        pageIndex={pageIndex}
        width={width}
        height={height}
        scale={scale}
      />
      <StampPicker
        open={stampPickerOpen}
        onClose={() => setStampPickerOpen(false)}
        onPick={handleStampPick}
      />
    </div>
  );
}
