import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listSystemFonts } from "@/lib/tauri";
import type { FreetextData } from "@/types/annotations";

// Popular font families from Windows, shown in dropdown.
const POPULAR_FAMILIES = [
  "Arial",
  "Calibri",
  "Cambria",
  "Candara",
  "Comic Sans MS",
  "Consolas",
  "Constantia",
  "Corbel",
  "Courier New",
  "Georgia",
  "Impact",
  "Lucida Sans Unicode",
  "Palatino Linotype",
  "Segoe UI",
  "Tahoma",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
];

const FAMILY_FILES: Record<
  string,
  { regular: string; bold?: string; italic?: string; boldItalic?: string }
> = {
  Arial: { regular: "arial.ttf", bold: "arialbd.ttf", italic: "ariali.ttf", boldItalic: "arialbi.ttf" },
  Calibri: { regular: "calibri.ttf", bold: "calibrib.ttf", italic: "calibrii.ttf", boldItalic: "calibriz.ttf" },
  Cambria: { regular: "cambria.ttc", bold: "cambriab.ttf", italic: "cambriai.ttf", boldItalic: "cambriaz.ttf" },
  Candara: { regular: "candara.ttf", bold: "candarab.ttf", italic: "candarai.ttf", boldItalic: "candaraz.ttf" },
  "Comic Sans MS": { regular: "comic.ttf", bold: "comicbd.ttf", italic: "comici.ttf", boldItalic: "comicz.ttf" },
  Consolas: { regular: "consola.ttf", bold: "consolab.ttf", italic: "consolai.ttf", boldItalic: "consolaz.ttf" },
  Constantia: { regular: "constan.ttf", bold: "constanb.ttf", italic: "constani.ttf", boldItalic: "constanz.ttf" },
  Corbel: { regular: "corbel.ttf", bold: "corbelb.ttf", italic: "corbeli.ttf", boldItalic: "corbelz.ttf" },
  "Courier New": { regular: "cour.ttf", bold: "courbd.ttf", italic: "couri.ttf", boldItalic: "courbi.ttf" },
  Georgia: { regular: "georgia.ttf", bold: "georgiab.ttf", italic: "georgiai.ttf", boldItalic: "georgiaz.ttf" },
  Impact: { regular: "impact.ttf" },
  "Lucida Sans Unicode": { regular: "l_10646.ttf" },
  "Palatino Linotype": { regular: "pala.ttf", bold: "palab.ttf", italic: "palai.ttf", boldItalic: "palabi.ttf" },
  "Segoe UI": { regular: "segoeui.ttf", bold: "segoeuib.ttf", italic: "segoeuii.ttf", boldItalic: "segoeuiz.ttf" },
  Tahoma: { regular: "tahoma.ttf", bold: "tahomabd.ttf" },
  "Times New Roman": { regular: "times.ttf", bold: "timesbd.ttf", italic: "timesi.ttf", boldItalic: "timesbi.ttf" },
  "Trebuchet MS": { regular: "trebuc.ttf", bold: "trebucbd.ttf", italic: "trebucit.ttf", boldItalic: "trebucbi.ttf" },
  Verdana: { regular: "verdana.ttf", bold: "verdanab.ttf", italic: "verdanai.ttf", boldItalic: "verdanaz.ttf" },
};

export interface FreeTextEditorProps {
  /** Initial text (empty for new). */
  initialText?: string;
  /** Initial format. */
  initialFormat?: Partial<FreetextData>;
  /** PDF-point position of top-left of the text box, relative to rendered page. */
  positionPx: { left: number; top: number };
  /** Called when user commits (Enter w/o shift, or click check). */
  onCommit: (text: string, format: FreetextData) => void;
  /** Called when user cancels (Escape, click X, or blur with empty text). */
  onCancel: () => void;
}

export function FreeTextEditor({
  initialText = "",
  initialFormat,
  positionPx,
  onCommit,
  onCancel,
}: FreeTextEditorProps) {
  const [text, setText] = useState(initialText);
  const [family, setFamily] = useState(initialFormat?.font ?? "Arial");
  const [size, setSize] = useState(initialFormat?.size ?? 14);
  const [bold, setBold] = useState(initialFormat?.bold ?? false);
  const [italic, setItalic] = useState(initialFormat?.italic ?? false);
  const [color, setColor] = useState(initialFormat?.color ?? "#000000");
  const [systemFonts, setSystemFonts] = useState<[string, string][]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listSystemFonts().then(setSystemFonts).catch(() => {});
  }, []);

  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, []);

  const fontsByStem = useRef<Record<string, string>>({});
  useEffect(() => {
    const m: Record<string, string> = {};
    for (const [name, path] of systemFonts) {
      m[name.toLowerCase()] = path;
    }
    fontsByStem.current = m;
  }, [systemFonts]);

  const resolveTtfPath = (): string | null => {
    const mapping = FAMILY_FILES[family];
    if (!mapping) return null;
    const variant =
      bold && italic && mapping.boldItalic
        ? mapping.boldItalic
        : bold && mapping.bold
          ? mapping.bold
          : italic && mapping.italic
            ? mapping.italic
            : mapping.regular;
    const stem = variant.replace(/\.(ttf|otf|ttc)$/i, "").toLowerCase();
    return fontsByStem.current[stem] ?? null;
  };

  const familyFallback = (): "helvetica" | "times" | "courier" =>
    family === "Times New Roman" || family === "Georgia" || family === "Cambria"
      ? "times"
      : family === "Courier New" ||
          family === "Consolas" ||
          family === "Lucida Console"
        ? "courier"
        : "helvetica";

  const commit = () => {
    if (!text.trim()) {
      onCancel();
      return;
    }
    onCommit(text, {
      font: family,
      size,
      bold,
      italic,
      color,
      ttfPath: resolveTtfPath(),
      familyFallback: familyFallback(),
    });
  };

  const handleEscape = () => {
    // Si hay texto escrito, pedir confirmacion antes de descartar.
    if (text.trim() && !window.confirm("Descartar el texto sin guardar?")) {
      return;
    }
    onCancel();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleEscape();
    } else if (e.key === "Enter" && e.ctrlKey) {
      // Ctrl+Enter o Enter (sin Ctrl) ambos guardan, para usuarios que
      // esperan comportamiento Word-like. Enter solo (sin Ctrl) tambien
      // se permite para compatibilidad. Shift+Enter = salto de linea.
      e.preventDefault();
      commit();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commit();
    }
    // Shift+Enter sigue su flujo normal (nueva linea en textarea)
  };

  /**
   * onBlur del wrapper: si el focus se va a un elemento FUERA del editor
   * (no a la toolbar interna), guardamos automaticamente. Comportamiento
   * tipo Word: "click fuera = guardar".
   */
  const handleWrapperBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) {
      // El focus va a otro elemento DENTRO del editor (ej. boton bold).
      // No hacer nada.
      return;
    }
    // Click fuera: si hay texto, guardar; si no, cancelar.
    if (text.trim()) {
      commit();
    } else {
      onCancel();
    }
  };

  // Ensure toolbar stays inside viewport: if box near top, show toolbar below.
  const toolbarAbove = positionPx.top > 80;

  return (
    <div
      className="absolute z-50"
      style={{ left: positionPx.left, top: positionPx.top }}
      onClick={(e) => e.stopPropagation()}
      onBlur={handleWrapperBlur}
      tabIndex={-1}
    >
      {/* Hint para el usuario: como guardar */}
      <div
        className={`absolute ${toolbarAbove ? "-top-20" : "top-full mt-12"} left-0 text-[10px] text-muted-foreground bg-background/90 border rounded px-1.5 py-0.5 pointer-events-none`}
        style={{ whiteSpace: "nowrap" }}
      >
        Enter o click fuera = Guardar · Shift+Enter = nueva linea · Esc = descartar
      </div>

      {/* Floating format toolbar */}
      <div
        className={`absolute ${toolbarAbove ? "-top-12" : "top-full mt-1"} left-0 flex items-center gap-1 bg-popover border rounded-md shadow-lg px-1.5 py-1 text-sm`}
        style={{ whiteSpace: "nowrap" }}
      >
        <select
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          className="h-7 text-xs border rounded px-1 bg-background"
          style={{ minWidth: 110 }}
          title="Fuente"
        >
          <optgroup label="Populares">
            {POPULAR_FAMILIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </optgroup>
          <optgroup label="Built-in PDF">
            <option value="Helvetica">Helvetica</option>
            <option value="Times">Times</option>
            <option value="Courier">Courier</option>
          </optgroup>
          {systemFonts.length > 0 && (
            <optgroup label={`Sistema (${systemFonts.length})`}>
              {systemFonts.map(([name]) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <input
          type="number"
          value={size}
          onChange={(e) => setSize(parseInt(e.target.value) || 14)}
          min={6}
          max={200}
          className="h-7 w-14 text-xs border rounded px-1 bg-background"
          title="Tamaño (pt)"
        />
        <Button
          size="icon"
          variant={bold ? "default" : "ghost"}
          onClick={() => setBold(!bold)}
          title="Negrita"
          className="h-7 w-7"
        >
          <Bold className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant={italic ? "default" : "ghost"}
          onClick={() => setItalic(!italic)}
          title="Cursiva"
          className="h-7 w-7"
        >
          <Italic className="h-3 w-3" />
        </Button>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-7 w-7 border rounded cursor-pointer"
          title="Color"
        />
        <div className="w-px h-5 bg-border mx-1" />
        <Button
          variant="default"
          onClick={commit}
          title="Guardar (Enter o click fuera del editor)"
          className="h-7 px-3 bg-green-600 hover:bg-green-700 text-white font-medium"
        >
          <Check className="h-3 w-3 mr-1" />
          Guardar
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleEscape}
          title="Descartar (Esc)"
          className="h-7 w-7 text-destructive"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Editable text area */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        rows={Math.max(1, text.split("\n").length)}
        className="min-w-[180px] min-h-[28px] px-2 py-1 bg-transparent outline-none resize-both border border-dashed border-primary/60 rounded"
        style={{
          fontFamily: family,
          fontSize: `${size}px`,
          fontWeight: bold ? 700 : 400,
          fontStyle: italic ? "italic" : "normal",
          color,
          lineHeight: 1.2,
        }}
        placeholder="Escribe aquí..."
      />
    </div>
  );
}
