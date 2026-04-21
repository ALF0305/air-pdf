import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bold, Italic } from "lucide-react";
import { usePdfStore } from "@/stores/pdfStore";
import { useUiStore } from "@/stores/uiStore";
import {
  addFormattedText,
  listSystemFonts,
  savePdfBackup,
  saveVersion,
} from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
}

// Curated popular font families (shown at top of dropdown if available).
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
  "Lucida Console",
  "Lucida Sans Unicode",
  "Palatino Linotype",
  "Segoe UI",
  "Tahoma",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
];

// Map family name → Windows Fonts filename for Regular/Bold/Italic/Bold-Italic.
const FAMILY_FILES: Record<
  string,
  { regular: string; bold?: string; italic?: string; boldItalic?: string }
> = {
  Arial: {
    regular: "arial.ttf",
    bold: "arialbd.ttf",
    italic: "ariali.ttf",
    boldItalic: "arialbi.ttf",
  },
  Calibri: {
    regular: "calibri.ttf",
    bold: "calibrib.ttf",
    italic: "calibrii.ttf",
    boldItalic: "calibriz.ttf",
  },
  Cambria: {
    regular: "cambria.ttc",
    bold: "cambriab.ttf",
    italic: "cambriai.ttf",
    boldItalic: "cambriaz.ttf",
  },
  Candara: {
    regular: "candara.ttf",
    bold: "candarab.ttf",
    italic: "candarai.ttf",
    boldItalic: "candaraz.ttf",
  },
  "Comic Sans MS": {
    regular: "comic.ttf",
    bold: "comicbd.ttf",
    italic: "comici.ttf",
    boldItalic: "comicz.ttf",
  },
  Consolas: {
    regular: "consola.ttf",
    bold: "consolab.ttf",
    italic: "consolai.ttf",
    boldItalic: "consolaz.ttf",
  },
  Constantia: {
    regular: "constan.ttf",
    bold: "constanb.ttf",
    italic: "constani.ttf",
    boldItalic: "constanz.ttf",
  },
  Corbel: {
    regular: "corbel.ttf",
    bold: "corbelb.ttf",
    italic: "corbeli.ttf",
    boldItalic: "corbelz.ttf",
  },
  "Courier New": {
    regular: "cour.ttf",
    bold: "courbd.ttf",
    italic: "couri.ttf",
    boldItalic: "courbi.ttf",
  },
  Georgia: {
    regular: "georgia.ttf",
    bold: "georgiab.ttf",
    italic: "georgiai.ttf",
    boldItalic: "georgiaz.ttf",
  },
  Impact: { regular: "impact.ttf" },
  "Lucida Console": { regular: "lucon.ttf" },
  "Lucida Sans Unicode": { regular: "l_10646.ttf" },
  "Palatino Linotype": {
    regular: "pala.ttf",
    bold: "palab.ttf",
    italic: "palai.ttf",
    boldItalic: "palabi.ttf",
  },
  "Segoe UI": {
    regular: "segoeui.ttf",
    bold: "segoeuib.ttf",
    italic: "segoeuii.ttf",
    boldItalic: "segoeuiz.ttf",
  },
  Tahoma: { regular: "tahoma.ttf", bold: "tahomabd.ttf" },
  "Times New Roman": {
    regular: "times.ttf",
    bold: "timesbd.ttf",
    italic: "timesi.ttf",
    boldItalic: "timesbi.ttf",
  },
  "Trebuchet MS": {
    regular: "trebuc.ttf",
    bold: "trebucbd.ttf",
    italic: "trebucit.ttf",
    boldItalic: "trebucbi.ttf",
  },
  Verdana: {
    regular: "verdana.ttf",
    bold: "verdanab.ttf",
    italic: "verdanai.ttf",
    boldItalic: "verdanaz.ttf",
  },
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [
    isNaN(r) ? 0 : r,
    isNaN(g) ? 0 : g,
    isNaN(b) ? 0 : b,
  ];
}

export function AddTextDialog({ open, onClose }: Props) {
  const tab = usePdfStore((s) => s.getActiveTab());
  const currentPage = usePdfStore((s) => s.currentPage);
  const bumpRefresh = useUiStore((s) => s.bumpRefresh);

  const [text, setText] = useState("");
  const [family, setFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(14);
  const [color, setColor] = useState("#000000");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [x, setX] = useState(72);
  const [y, setY] = useState(720);
  const [systemFonts, setSystemFonts] = useState<[string, string][]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    listSystemFonts().then(setSystemFonts).catch(() => setSystemFonts([]));
  }, [open]);

  // Map system fonts for quick lookup by file stem.
  const fontsByStem = useMemo(() => {
    const m: Record<string, string> = {};
    for (const [name, path] of systemFonts) {
      m[name.toLowerCase()] = path;
    }
    return m;
  }, [systemFonts]);

  // Curated families that are actually installed.
  const availablePopular = useMemo(() => {
    return POPULAR_FAMILIES.filter((f) => {
      const file = FAMILY_FILES[f]?.regular;
      if (!file) return false;
      const stem = file.replace(/\.(ttf|otf|ttc)$/i, "").toLowerCase();
      return fontsByStem[stem] != null;
    });
  }, [fontsByStem]);

  if (!tab) return null;

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
    return fontsByStem[stem] ?? null;
  };

  const familyFallback: "helvetica" | "times" | "courier" =
    family === "Times New Roman" || family === "Georgia" || family === "Cambria"
      ? "times"
      : family === "Courier New" ||
          family === "Consolas" ||
          family === "Lucida Console"
        ? "courier"
        : "helvetica";

  const handleApply = async () => {
    if (!text) {
      alert("Escribe algo de texto.");
      return;
    }
    setBusy(true);
    try {
      await saveVersion(tab.path);
      await savePdfBackup(tab.path, tab.path + ".bak");
      await addFormattedText({
        inputPath: tab.path,
        outputPath: tab.path,
        pageIndex: currentPage,
        text,
        x,
        y,
        fontSize,
        color: hexToRgb(color),
        ttfPath: resolveTtfPath(),
        familyFallback,
        bold,
        italic,
      });
      bumpRefresh();
      onClose();
    } catch (e) {
      alert(`Error: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-background">
        <DialogHeader>
          <DialogTitle>Añadir texto al PDF</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Se añade al PDF con la fuente elegida embebida. Página actual:{" "}
            {currentPage + 1}. Coordenadas en puntos desde esquina inferior
            izquierda.
          </p>

          <div className="space-y-1">
            <Label htmlFor="at-text">Texto</Label>
            <textarea
              id="at-text"
              rows={4}
              className="w-full border rounded p-2 text-sm bg-background"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe aquí... (usa Enter para saltos de línea)"
              style={{
                fontFamily: family,
                fontWeight: bold ? 700 : 400,
                fontStyle: italic ? "italic" : "normal",
                fontSize: `${Math.min(fontSize, 20)}px`,
                color,
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="at-font">Fuente</Label>
              <select
                id="at-font"
                className="w-full border rounded px-2 py-1.5 text-sm bg-background"
                value={family}
                onChange={(e) => setFamily(e.target.value)}
              >
                <optgroup label="Populares">
                  {availablePopular.map((f) => (
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
                <optgroup label={`Todas las del sistema (${systemFonts.length})`}>
                  {systemFonts.map(([name]) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="at-size">Tamaño (pt)</Label>
              <Input
                id="at-size"
                type="number"
                min={6}
                max={200}
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value) || 14)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={bold ? "default" : "outline"}
              onClick={() => setBold(!bold)}
              title="Negrita"
            >
              <Bold className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant={italic ? "default" : "outline"}
              onClick={() => setItalic(!italic)}
              title="Cursiva"
            >
              <Italic className="h-3 w-3" />
            </Button>
            <Label htmlFor="at-color" className="ml-2">
              Color
            </Label>
            <input
              id="at-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-12 border rounded cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="at-x">Posición X (pt)</Label>
              <Input
                id="at-x"
                type="number"
                value={x}
                onChange={(e) => setX(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="at-y">Posición Y (pt, desde abajo)</Label>
              <Input
                id="at-y"
                type="number"
                value={y}
                onChange={(e) => setY(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={busy || !text}>
            {busy ? "Añadiendo..." : "Añadir texto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
