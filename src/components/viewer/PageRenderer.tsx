import { useEffect, useRef, useState } from "react";
import { renderPage } from "@/lib/tauri";
import { AnnotationLayer } from "@/components/annotations/AnnotationLayer";
import { StampPicker, type Stamp } from "@/components/annotations/StampPicker";
import { FreeTextEditor } from "@/components/annotations/FreeTextEditor";
import { useAnnotationStore } from "@/stores/annotationStore";
import { useUiStore } from "@/stores/uiStore";
import type { FreetextData } from "@/types/annotations";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

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
  const [freeTextEditor, setFreeTextEditor] = useState<{
    leftPx: number;
    topPx: number;
    pdfX: number;
    pdfY: number;
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

  const handleAreaClick = async (e: React.MouseEvent) => {
    if (tool !== "stamp" && tool !== "freetext" && tool !== "image") return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;

    if (tool === "stamp") {
      setPendingStampPos({ x: xPx / scale, y: yPx / scale });
      setStampPickerOpen(true);
      return;
    }

    if (tool === "freetext") {
      setFreeTextEditor({
        leftPx: xPx,
        topPx: yPx,
        pdfX: xPx / scale,
        pdfY: yPx / scale,
      });
      return;
    }

    if (tool === "image") {
      const picked = await openDialog({
        multiple: false,
        filters: [
          {
            name: "Imagen",
            extensions: ["png", "jpg", "jpeg", "webp", "bmp", "tiff", "gif"],
          },
        ],
      });
      if (typeof picked !== "string") return;

      // Probe image natural size (for aspect ratio) via HTML Image.
      const getSize = (): Promise<{ w: number; h: number }> =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = () => resolve({ w: 200, h: 120 });
          // Tauri's asset protocol:
          img.src = `data:image/placeholder,${encodeURIComponent(picked)}`;
          // Fallback: use default size on any error
          setTimeout(() => resolve({ w: 200, h: 120 }), 800);
        });

      const { w: natW, h: natH } = await getSize();
      // Default placement: 200pt wide, scaled height by aspect.
      const defaultW = 200;
      const aspect = natH > 0 && natW > 0 ? natH / natW : 0.6;
      const defaultH = defaultW * aspect;
      const pdfX = xPx / scale;
      const pdfY = yPx / scale;
      await add({
        type: "image",
        page: pageIndex,
        rect: [pdfX, pdfY, pdfX + defaultW, pdfY + defaultH],
        color: "#000000",
        author: "Alfredo",
        data: { imagePath: picked, nativeWidth: natW, nativeHeight: natH },
      });
    }
  };

  const handleFreeTextCommit = async (text: string, format: FreetextData) => {
    if (!freeTextEditor) return;
    const { pdfX, pdfY } = freeTextEditor;
    // Overlay-space coords (top-left). PDF embed converts at flatten time.
    const textWidth = Math.max(60, text.length * format.size * 0.55);
    const lines = text.split("\n").length;
    const textHeight = lines * format.size * 1.3;
    await add({
      type: "freetext",
      page: pageIndex,
      rect: [pdfX, pdfY, pdfX + textWidth, pdfY + textHeight],
      color: format.color,
      author: "Alfredo",
      text,
      data: format,
    });
    setFreeTextEditor(null);
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
      style={{
        width: width * scale,
        height: height * scale,
        cursor:
          tool === "freetext"
            ? "text"
            : tool === "image" || tool === "stamp"
              ? "crosshair"
              : undefined,
      }}
      onClick={
        tool === "stamp" || tool === "freetext" || tool === "image"
          ? handleAreaClick
          : undefined
      }
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
      {freeTextEditor && (
        <FreeTextEditor
          positionPx={{ left: freeTextEditor.leftPx, top: freeTextEditor.topPx }}
          onCommit={handleFreeTextCommit}
          onCancel={() => setFreeTextEditor(null)}
        />
      )}
    </div>
  );
}
