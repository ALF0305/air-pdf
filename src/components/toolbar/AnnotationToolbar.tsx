import { Button } from "@/components/ui/button";
import { useAnnotationStore, type Tool } from "@/stores/annotationStore";
import {
  MousePointer2,
  Highlighter,
  Underline,
  Strikethrough,
  StickyNote,
  Pencil,
  Stamp,
  Square,
  Circle,
  ArrowUpRight,
  Type,
  ImagePlus,
} from "lucide-react";
import { clsx } from "clsx";

const TOOLS: {
  tool: Tool;
  icon: typeof MousePointer2;
  label: string;
  shortcut?: string;
}[] = [
  { tool: "select", icon: MousePointer2, label: "Seleccionar", shortcut: "S" },
  { tool: "freetext", icon: Type, label: "Añadir texto", shortcut: "T" },
  { tool: "image", icon: ImagePlus, label: "Agregar imagen", shortcut: "I" },
  { tool: "highlight", icon: Highlighter, label: "Resaltar", shortcut: "H" },
  { tool: "underline", icon: Underline, label: "Subrayar", shortcut: "U" },
  { tool: "strikethrough", icon: Strikethrough, label: "Tachar" },
  { tool: "note", icon: StickyNote, label: "Nota", shortcut: "N" },
  { tool: "pen", icon: Pencil, label: "Dibujar", shortcut: "P" },
  { tool: "stamp", icon: Stamp, label: "Sello" },
  { tool: "rect", icon: Square, label: "Rectángulo" },
  { tool: "circle", icon: Circle, label: "Círculo" },
  { tool: "arrow", icon: ArrowUpRight, label: "Flecha" },
];

const COLORS = [
  { color: "#FFEB3B", name: "Amarillo" },
  { color: "#FF9800", name: "Naranja" },
  { color: "#F44336", name: "Rojo" },
  { color: "#4CAF50", name: "Verde" },
  { color: "#2196F3", name: "Azul" },
  { color: "#9C27B0", name: "Morado" },
  { color: "#000000", name: "Negro" },
  { color: "#FFFFFF", name: "Blanco" },
];

const CATEGORIES = [
  "Importante",
  "Revisar",
  "Dosis",
  "Diagnóstico",
  "Pregunta",
  "Cita",
];

export function AnnotationToolbar() {
  const activeTool = useAnnotationStore((s) => s.activeTool);
  const activeColor = useAnnotationStore((s) => s.activeColor);
  const activeCategory = useAnnotationStore((s) => s.activeCategory);
  const activeStrokeWidth = useAnnotationStore((s) => s.activeStrokeWidth);
  const setTool = useAnnotationStore((s) => s.setTool);
  const setColor = useAnnotationStore((s) => s.setColor);
  const setCategory = useAnnotationStore((s) => s.setCategory);
  const setStrokeWidth = useAnnotationStore((s) => s.setStrokeWidth);

  const showStrokeWidth =
    activeTool === "rect" || activeTool === "circle" || activeTool === "arrow";

  return (
    <div className="flex items-center gap-2 border-b px-2 py-1 bg-muted/50">
      <div className="flex items-center gap-0.5">
        {TOOLS.map(({ tool, icon: Icon, label, shortcut }) => (
          <Button
            key={tool}
            variant={activeTool === tool ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setTool(tool)}
            title={shortcut ? `${label} (${shortcut})` : label}
            aria-label={label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </div>
      <div className="w-px h-6 bg-border" />
      <div className="flex items-center gap-1">
        {COLORS.map(({ color, name }) => (
          <button
            key={color}
            onClick={() => setColor(color)}
            className={clsx(
              "w-5 h-5 rounded border-2 transition-all",
              activeColor === color ? "border-primary scale-110" : "border-border"
            )}
            style={{ backgroundColor: color }}
            title={name}
            aria-label={name}
          />
        ))}
      </div>
      <div className="w-px h-6 bg-border" />
      <select
        value={activeCategory}
        onChange={(e) => setCategory(e.target.value)}
        className="text-sm bg-background border rounded px-2 py-1"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      {showStrokeWidth && (
        <>
          <div className="w-px h-6 bg-border" />
          <label className="text-xs text-muted-foreground" htmlFor="stroke-width">
            Grosor:
          </label>
          <select
            id="stroke-width"
            value={activeStrokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="text-sm bg-background border rounded px-2 py-1"
            title="Grosor del trazo en pixeles"
          >
            <option value={1}>1 px</option>
            <option value={2}>2 px</option>
            <option value={3}>3 px</option>
            <option value={4}>4 px</option>
            <option value={6}>6 px</option>
            <option value={8}>8 px</option>
            <option value={12}>12 px</option>
          </select>
        </>
      )}
    </div>
  );
}
