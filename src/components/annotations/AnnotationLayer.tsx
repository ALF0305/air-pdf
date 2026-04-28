import { useAnnotationStore } from "@/stores/annotationStore";
import { usePageInteraction } from "@/hooks/usePageInteraction";
import type { Annotation } from "@/types/annotations";
import type React from "react";
import { ResizableBox } from "./ResizableBox";
import { convertFileSrc } from "@tauri-apps/api/core";

interface Props {
  pageIndex: number;
  width: number;
  height: number;
  scale: number;
  /**
   * Si se provee, las imagenes anotadas muestran un boton "Incrustar en PDF"
   * cuando estan seleccionadas. El callback recibe la anotacion para que el
   * padre invoque el backend (stampImage) con sus coordenadas.
   */
  onEmbedImage?: (annotation: Annotation) => void;
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
    case "rect": {
      const sw = a.strokeWidth ?? 2;
      return (
        <div
          key={a.id}
          style={{ ...style, border: `${sw}px solid ${a.color}` }}
          onClick={handleClick}
        />
      );
    }
    case "circle": {
      const sw = a.strokeWidth ?? 2;
      return (
        <div
          key={a.id}
          style={{
            ...style,
            border: `${sw}px solid ${a.color}`,
            borderRadius: "50%",
          }}
          onClick={handleClick}
        />
      );
    }
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
            strokeWidth={a.strokeWidth ?? 2}
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
    case "freetext":
    case "image":
      // These are rendered specially in the AnnotationLayer render fn below
      // (they need ResizableBox + update callbacks), so skip here.
      return null;
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

export function AnnotationLayer({ pageIndex, width, height, scale, onEmbedImage }: Props) {
  const annotations = useAnnotationStore((s) => s.annotations);
  const selectedId = useAnnotationStore((s) => s.selectedId);
  const select = useAnnotationStore((s) => s.selectAnnotation);
  const updateAnn = useAnnotationStore((s) => s.update);
  const removeAnn = useAnnotationStore((s) => s.remove);
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

  // Freetext and image use interactive ResizableBox; always movable/resizable.
  const renderMovable = (a: Annotation) => {
    const [x1, y1, x2, y2] = a.rect;
    const isSel = a.id === selectedId;
    const onBoxChange = (b: {
      x: number;
      y: number;
      width: number;
      height: number;
    }) => {
      updateAnn({
        ...a,
        rect: [b.x, b.y, b.x + b.width, b.y + b.height],
      });
    };
    if (a.type === "freetext") {
      const d = a.data as {
        font?: string;
        size?: number;
        bold?: boolean;
        italic?: boolean;
        color?: string;
      } | undefined;
      const fontSize = (d?.size ?? 14) * scale;
      return (
        <ResizableBox
          key={a.id}
          x={x1}
          y={y1}
          width={x2 - x1}
          height={y2 - y1}
          scale={scale}
          selected={isSel}
          onChange={onBoxChange}
          onSelect={() => select(a.id)}
          onDelete={() => removeAnn(a.id)}
          minWidth={30}
          minHeight={14}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              fontFamily: d?.font ?? "Arial",
              fontSize,
              fontWeight: d?.bold ? 700 : 400,
              fontStyle: d?.italic ? "italic" : "normal",
              color: d?.color ?? a.color ?? "#000000",
              lineHeight: 1.2,
              whiteSpace: "pre-wrap",
              overflow: "hidden",
              padding: 1,
            }}
          >
            {a.text}
          </div>
        </ResizableBox>
      );
    }
    if (a.type === "image") {
      const d = a.data as { imagePath?: string } | undefined;
      const src = d?.imagePath ? convertFileSrc(d.imagePath) : "";
      const actions = isSel && onEmbedImage ? (
        <button
          type="button"
          onClick={() => onEmbedImage(a)}
          style={{
            fontSize: 12,
            padding: "2px 8px",
            background: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: 3,
            cursor: "pointer",
          }}
          title="Incrustar la imagen como objeto del PDF (queda como parte del documento, no como anotacion)"
        >
          Incrustar en PDF
        </button>
      ) : null;
      return (
        <ResizableBox
          key={a.id}
          x={x1}
          y={y1}
          width={x2 - x1}
          height={y2 - y1}
          scale={scale}
          selected={isSel}
          onChange={onBoxChange}
          onSelect={() => select(a.id)}
          onDelete={() => removeAnn(a.id)}
          minWidth={20}
          minHeight={20}
          lockAspect
          actions={actions}
        >
          <img
            src={src}
            alt=""
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              pointerEvents: "none",
              userSelect: "none",
            }}
          />
        </ResizableBox>
      );
    }
    return null;
  };

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
        a.type === "freetext" || a.type === "image"
          ? renderMovable(a)
          : renderAnnotation(a, scale, a.id === selectedId, select, canSelect)
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
