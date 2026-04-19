import { useEffect, useState } from "react";
import { renderPage } from "@/lib/tauri";
import { AnnotationLayer } from "@/components/annotations/AnnotationLayer";
import { StampPicker, type Stamp } from "@/components/annotations/StampPicker";
import { useAnnotationStore } from "@/stores/annotationStore";

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
  const [stampPickerOpen, setStampPickerOpen] = useState(false);
  const [pendingStampPos, setPendingStampPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const tool = useAnnotationStore((s) => s.activeTool);
  const add = useAnnotationStore((s) => s.add);

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
      className="relative bg-white shadow-md mx-auto my-4"
      style={{ width: width * scale, height: height * scale }}
      onClick={tool === "stamp" ? handleStampAreaClick : undefined}
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
