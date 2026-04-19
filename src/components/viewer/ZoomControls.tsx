import { Button } from "@/components/ui/button";
import { usePdfStore } from "@/stores/pdfStore";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];

export function ZoomControls() {
  const zoom = usePdfStore((s) => s.zoom);
  const setZoom = usePdfStore((s) => s.setZoom);

  const currentScale = typeof zoom === "number" ? zoom : 1.0;

  const zoomIn = () => {
    const next = ZOOM_LEVELS.find((z) => z > currentScale) ?? 3.0;
    setZoom(next);
  };

  const zoomOut = () => {
    const next = [...ZOOM_LEVELS].reverse().find((z) => z < currentScale) ?? 0.5;
    setZoom(next);
  };

  const fitWidth = () => setZoom("fit-width");
  const reset = () => setZoom(1.0);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={zoomOut}
        aria-label="Zoom out"
        title="Zoom out (Ctrl+-)"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <button
        onClick={reset}
        className="text-sm tabular-nums w-14 hover:underline"
        aria-label="Reset zoom"
        title="Reset zoom (click)"
      >
        {Math.round(currentScale * 100)}%
      </button>
      <Button
        variant="ghost"
        size="icon"
        onClick={zoomIn}
        aria-label="Zoom in"
        title="Zoom in (Ctrl++)"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={fitWidth}
        aria-label="Fit width"
        title="Ajustar al ancho"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
