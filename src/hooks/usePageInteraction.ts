import { useState, useCallback } from "react";
import { useAnnotationStore } from "@/stores/annotationStore";

export interface DragState {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function usePageInteraction(pageIndex: number, scale: number) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [penPath, setPenPath] = useState<[number, number][]>([]);
  const tool = useAnnotationStore((s) => s.activeTool);
  const color = useAnnotationStore((s) => s.activeColor);
  const category = useAnnotationStore((s) => s.activeCategory);
  const strokeWidth = useAnnotationStore((s) => s.activeStrokeWidth);
  const add = useAnnotationStore((s) => s.add);

  const isDrawingTool =
    tool === "highlight" ||
    tool === "underline" ||
    tool === "strikethrough" ||
    tool === "rect" ||
    tool === "circle" ||
    tool === "arrow" ||
    tool === "note";
  const isPen = tool === "pen";

  const getCoords = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  };

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const { x, y } = getCoords(e);
      if (isPen) {
        setPenPath([[x, y]]);
      } else if (isDrawingTool) {
        setDrag({ startX: x, startY: y, endX: x, endY: y });
      }
    },
    [isDrawingTool, isPen, scale]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const { x, y } = getCoords(e);
      if (isPen && penPath.length > 0) {
        setPenPath((p) => [...p, [x, y]]);
      } else if (drag) {
        setDrag({ ...drag, endX: x, endY: y });
      }
    },
    [drag, isPen, penPath.length, scale]
  );

  const onMouseUp = useCallback(async () => {
    if (isPen && penPath.length >= 2) {
      const xs = penPath.map(([x]) => x);
      const ys = penPath.map(([, y]) => y);
      await add({
        type: "drawing",
        page: pageIndex,
        rect: [
          Math.min(...xs),
          Math.min(...ys),
          Math.max(...xs),
          Math.max(...ys),
        ],
        color,
        category,
        author: "Alfredo",
        data: { points: penPath },
      });
      setPenPath([]);
      return;
    }
    setPenPath([]);

    if (!drag) return;
    const { startX, startY, endX, endY } = drag;
    const x1 = Math.min(startX, endX);
    const y1 = Math.min(startY, endY);
    const x2 = Math.max(startX, endX);
    const y2 = Math.max(startY, endY);

    if (Math.abs(x2 - x1) < 5 && Math.abs(y2 - y1) < 5) {
      setDrag(null);
      return;
    }

    if (
      tool === "highlight" ||
      tool === "underline" ||
      tool === "strikethrough" ||
      tool === "rect" ||
      tool === "circle" ||
      tool === "arrow"
    ) {
      const usesStroke = tool === "rect" || tool === "circle" || tool === "arrow";
      await add({
        type: tool,
        page: pageIndex,
        rect: [x1, y1, x2, y2],
        color,
        category,
        author: "Alfredo",
        ...(usesStroke ? { strokeWidth } : {}),
      });
    } else if (tool === "note") {
      const noteText = prompt("Texto de la nota:");
      if (noteText) {
        await add({
          type: "note",
          page: pageIndex,
          rect: [x1, y1, x1 + 24, y1 + 24],
          color,
          category,
          author: "Alfredo",
          note: noteText,
        });
      }
    }
    setDrag(null);
  }, [drag, penPath, isPen, tool, color, category, strokeWidth, pageIndex, add]);

  return {
    onMouseDown,
    onMouseMove,
    onMouseUp,
    drag,
    penPath,
    tool,
    color,
    isInteractive: isDrawingTool || isPen,
  };
}
