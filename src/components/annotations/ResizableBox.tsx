import { useRef, useState, useEffect } from "react";

interface Props {
  /** Box position in overlay space (top-left). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Display scale (pixels per PDF point). */
  scale: number;
  /** Whether selected (show handles). */
  selected: boolean;
  /** Called with updated PDF-space coords when user drags or resizes. */
  onChange: (box: { x: number; y: number; width: number; height: number }) => void;
  /** Child content (text, image, etc.). */
  children: React.ReactNode;
  /** Optional minimum width/height in PDF points. */
  minWidth?: number;
  minHeight?: number;
  /** Called when box is clicked. */
  onSelect?: () => void;
  /** Called when right-clicked or delete key pressed while selected. */
  onDelete?: () => void;
  /** Preserve aspect ratio on corner-resize (e.g., images). */
  lockAspect?: boolean;
  /** Optional toolbar shown above the box when selected (e.g., "Incrustar"). */
  actions?: React.ReactNode;
}

type Handle = "move" | "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export function ResizableBox({
  x,
  y,
  width,
  height,
  scale,
  selected,
  onChange,
  children,
  minWidth = 20,
  minHeight = 20,
  onSelect,
  onDelete,
  lockAspect = false,
  actions,
}: Props) {
  const startRef = useRef<{
    mouseX: number;
    mouseY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    handle: Handle;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent, handle: Handle) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect?.();
    startRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      origX: x,
      origY: y,
      origW: width,
      origH: height,
      handle,
    };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent) => {
      const s = startRef.current;
      if (!s) return;
      const dxPx = e.clientX - s.mouseX;
      const dyPx = e.clientY - s.mouseY;
      const dx = dxPx / scale;
      const dy = dyPx / scale;

      let nx = s.origX;
      let ny = s.origY;
      let nw = s.origW;
      let nh = s.origH;

      switch (s.handle) {
        case "move":
          nx = s.origX + dx;
          ny = s.origY + dy;
          break;
        case "nw":
          nx = s.origX + dx;
          ny = s.origY + dy;
          nw = s.origW - dx;
          nh = s.origH - dy;
          break;
        case "n":
          ny = s.origY + dy;
          nh = s.origH - dy;
          break;
        case "ne":
          ny = s.origY + dy;
          nw = s.origW + dx;
          nh = s.origH - dy;
          break;
        case "e":
          nw = s.origW + dx;
          break;
        case "se":
          nw = s.origW + dx;
          nh = s.origH + dy;
          break;
        case "s":
          nh = s.origH + dy;
          break;
        case "sw":
          nx = s.origX + dx;
          nw = s.origW - dx;
          nh = s.origH + dy;
          break;
        case "w":
          nx = s.origX + dx;
          nw = s.origW - dx;
          break;
      }

      if (nw < minWidth) {
        if (["nw", "sw", "w"].includes(s.handle)) nx = s.origX + (s.origW - minWidth);
        nw = minWidth;
      }
      if (nh < minHeight) {
        if (["nw", "n", "ne"].includes(s.handle)) ny = s.origY + (s.origH - minHeight);
        nh = minHeight;
      }

      if (
        lockAspect &&
        ["nw", "ne", "se", "sw"].includes(s.handle) &&
        s.origW > 0 &&
        s.origH > 0
      ) {
        const aspect = s.origW / s.origH;
        // Prefer dimension with larger change
        if (Math.abs(nw - s.origW) > Math.abs(nh - s.origH) * aspect) {
          const newH = nw / aspect;
          if (["nw", "ne"].includes(s.handle)) ny = s.origY + (s.origH - newH);
          nh = newH;
        } else {
          const newW = nh * aspect;
          if (["nw", "sw"].includes(s.handle)) nx = s.origX + (s.origW - newW);
          nw = newW;
        }
      }

      onChange({ x: nx, y: ny, width: nw, height: nh });
    };

    const handleUp = () => {
      setDragging(false);
      startRef.current = null;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, scale, onChange, minWidth, minHeight, lockAspect]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        onDelete?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, onDelete]);

  const handleStyle: React.CSSProperties = {
    position: "absolute",
    width: 10,
    height: 10,
    background: "#2196F3",
    border: "1.5px solid white",
    borderRadius: 2,
    boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
  };

  return (
    <div
      style={{
        position: "absolute",
        left: x * scale,
        top: y * scale,
        width: width * scale,
        height: height * scale,
        cursor: dragging ? "grabbing" : "grab",
        outline: selected ? "2px solid #2196F3" : undefined,
        outlineOffset: 0,
        boxSizing: "border-box",
      }}
      onMouseDown={(e) => handleMouseDown(e, "move")}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      {children}
      {selected && actions && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: -34,
            display: "flex",
            gap: 4,
            background: "white",
            border: "1px solid #2196F3",
            borderRadius: 4,
            padding: "2px 4px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
            zIndex: 10,
            whiteSpace: "nowrap",
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
      {selected && (
        <>
          <div
            style={{ ...handleStyle, left: -6, top: -6, cursor: "nwse-resize" }}
            onMouseDown={(e) => handleMouseDown(e, "nw")}
          />
          <div
            style={{
              ...handleStyle,
              left: "50%",
              top: -6,
              transform: "translateX(-50%)",
              cursor: "ns-resize",
            }}
            onMouseDown={(e) => handleMouseDown(e, "n")}
          />
          <div
            style={{ ...handleStyle, right: -6, top: -6, cursor: "nesw-resize" }}
            onMouseDown={(e) => handleMouseDown(e, "ne")}
          />
          <div
            style={{
              ...handleStyle,
              right: -6,
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "ew-resize",
            }}
            onMouseDown={(e) => handleMouseDown(e, "e")}
          />
          <div
            style={{ ...handleStyle, right: -6, bottom: -6, cursor: "nwse-resize" }}
            onMouseDown={(e) => handleMouseDown(e, "se")}
          />
          <div
            style={{
              ...handleStyle,
              left: "50%",
              bottom: -6,
              transform: "translateX(-50%)",
              cursor: "ns-resize",
            }}
            onMouseDown={(e) => handleMouseDown(e, "s")}
          />
          <div
            style={{ ...handleStyle, left: -6, bottom: -6, cursor: "nesw-resize" }}
            onMouseDown={(e) => handleMouseDown(e, "sw")}
          />
          <div
            style={{
              ...handleStyle,
              left: -6,
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "ew-resize",
            }}
            onMouseDown={(e) => handleMouseDown(e, "w")}
          />
        </>
      )}
    </div>
  );
}
