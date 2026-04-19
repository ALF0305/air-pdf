import { useAnnotationStore } from "@/stores/annotationStore";
import { usePageInteraction } from "@/hooks/usePageInteraction";
import type { Annotation } from "@/types/annotations";
import type React from "react";

interface Props {
  pageIndex: number;
  width: number;
  height: number;
  scale: number;
}

function renderAnnotation(
  a: Annotation,
  scale: number,
  isSelected: boolean,
  onClick: (id: string) => void,
  canSelect: boolean
) {
  const [x1, y1, x2, y2] = a.rect;
  const style: React.CSSProperties = {
    position: "absolute",
    left: x1 * scale,
    top: y1 * scale,
    width: (x2 - x1) * scale,
    height: (y2 - y1) * scale,
    pointerEvents: canSelect ? "auto" : "none",
    cursor: canSelect ? "pointer" : "default",
    outline: isSelected ? "2px solid #2196F3" : undefined,
    outlineOffset: isSelected ? "2px" : undefined,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (canSelect) {
      e.stopPropagation();
      onClick(a.id);
    }
  };

  switch (a.type) {
    case "highlight":
      return (
        <div
          key={a.id}
          style={{
            ...style,
            backgroundColor: a.color,
            opacity: 0.4,
            mixBlendMode: "multiply",
          }}
          title={a.note ?? a.text ?? a.category ?? ""}
          onClick={handleClick}
        />
      );
    case "underline":
      return (
        <div
          key={a.id}
          style={{
            ...style,
            borderBottom: `2px solid ${a.color}`,
          }}
          onClick={handleClick}
        />
      );
    case "strikethrough":
      return (
        <div key={a.id} style={style} onClick={handleClick}>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              right: 0,
              borderBottom: `2px solid ${a.color}`,
            }}
          />
        </div>
      );
    case "rect":
      return (
        <div
          key={a.id}
          style={{ ...style, border: `2px solid ${a.color}` }}
          onClick={handleClick}
        />
      );
    case "circle":
      return (
        <div
          key={a.id}
          style={{
            ...style,
            border: `2px solid ${a.color}`,
            borderRadius: "50%",
          }}
          onClick={handleClick}
        />
      );
    case "arrow": {
      const dx = (x2 - x1) * scale;
      const dy = (y2 - y1) * scale;
      return (
        <svg
          key={a.id}
          style={{
            position: "absolute",
            left: x1 * scale,
            top: y1 * scale,
            width: dx,
            height: dy,
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          <defs>
            <marker
              id={`arrow-${a.id}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={a.color} />
            </marker>
          </defs>
          <line
            x1="0"
            y1="0"
            x2={dx}
            y2={dy}
            stroke={a.color}
            strokeWidth={2}
            markerEnd={`url(#arrow-${a.id})`}
            style={{ pointerEvents: canSelect ? "auto" : "none", cursor: canSelect ? "pointer" : "default" }}
            onClick={(e) => {
              if (canSelect) {
                e.stopPropagation();
                onClick(a.id);
              }
            }}
          />
        </svg>
      );
    }
    case "note":
      return (
        <div
          key={a.id}
          style={{
            ...style,
            width: 24,
            height: 24,
            backgroundColor: a.color,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: "#000",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
          title={a.note ?? ""}
          onClick={handleClick}
        >
          ✎
        </div>
      );
    case "drawing": {
      const points = (a.data as { points?: [number, number][] })?.points;
      if (!points || points.length < 2) return null;
      const pathD = points
        .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x * scale} ${y * scale}`)
        .join(" ");
      return (
        <svg
          key={a.id}
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          <path
            d={pathD}
            stroke={a.color}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              pointerEvents: canSelect ? "auto" : "none",
              cursor: canSelect ? "pointer" : "default",
            }}
            onClick={(e) => {
              if (canSelect) {
                e.stopPropagation();
                onClick(a.id);
              }
            }}
          />
        </svg>
      );
    }
    case "stamp": {
      const fgColor = (a.data as { fgColor?: string })?.fgColor || "#FFFFFF";
      return (
        <div
          key={a.id}
          style={{
            ...style,
            backgroundColor: a.color,
            color: fgColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            fontSize: Math.max(12, 14 * scale),
            border: `2px solid ${a.color}`,
            borderRadius: 4,
            boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            textTransform: "uppercase",
          }}
          onClick={handleClick}
        >
          {a.text}
        </div>
      );
    }
    default:
      return null;
  }
}

export function AnnotationLayer({ pageIndex, width, height, scale }: Props) {
  const annotations = useAnnotationStore((s) => s.annotations);
  const selectedId = useAnnotationStore((s) => s.selectedId);
  const select = useAnnotationStore((s) => s.selectAnnotation);
  const {
    onMouseDown,
    onMouseMove,
    onMouseUp,
    drag,
    penPath,
    tool,
    color,
    isInteractive,
  } = usePageInteraction(pageIndex, scale);

  const canSelect = tool === "select";
  const pageAnnotations = annotations.filter((a) => a.page === pageIndex);

  return (
    <div
      className="absolute inset-0"
      style={{
        width: width * scale,
        height: height * scale,
        pointerEvents: isInteractive || canSelect ? "auto" : "none",
        cursor: isInteractive ? "crosshair" : canSelect ? "default" : "default",
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onClick={() => canSelect && select(null)}
    >
      {pageAnnotations.map((a) =>
        renderAnnotation(a, scale, a.id === selectedId, select, canSelect)
      )}
      {drag && (
        <div
          style={{
            position: "absolute",
            left: Math.min(drag.startX, drag.endX) * scale,
            top: Math.min(drag.startY, drag.endY) * scale,
            width: Math.abs(drag.endX - drag.startX) * scale,
            height: Math.abs(drag.endY - drag.startY) * scale,
            backgroundColor: tool === "highlight" ? color : "transparent",
            opacity: tool === "highlight" ? 0.3 : 1,
            border:
              tool === "rect" || tool === "circle"
                ? `2px dashed ${color}`
                : tool === "underline" || tool === "strikethrough"
                  ? "1px dashed rgba(0,0,0,0.3)"
                  : "none",
            borderRadius: tool === "circle" ? "50%" : 0,
            pointerEvents: "none",
          }}
        />
      )}
      {penPath.length > 1 && (
        <svg
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          <path
            d={penPath
              .map(
                ([x, y], i) => `${i === 0 ? "M" : "L"} ${x * scale} ${y * scale}`
              )
              .join(" ")}
            stroke={color}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  );
}
