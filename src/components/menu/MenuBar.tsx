import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { usePdfStore } from "@/stores/pdfStore";
import { useUiStore } from "@/stores/uiStore";
import {
  addFormattedText,
  embedAnnotationsIntoPdf,
  extractTextToFile,
  getPagesInfo,
  loadAnnotations,
  printPdf,
  redactPdf,
  rotateDocument,
  savePdfBackup,
  saveVersion,
  stampImage,
  type RedactRect,
} from "@/lib/tauri";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";

interface Props {
  onOpen: () => void;
  onSearch: () => void;
}

export function MenuBar({ onOpen, onSearch }: Props) {
  const closeTab = usePdfStore((s) => s.closeTab);
  const activeTabId = usePdfStore((s) => s.activeTabId);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleReadingMode = useUiStore((s) => s.toggleReadingMode);
  const darkMode = useUiStore((s) => s.darkMode);
  const toggleDarkMode = useUiStore((s) => s.toggleDarkMode);
  const togglePresentation = useUiStore((s) => s.togglePresentation);
  const setViewMode = usePdfStore((s) => s.setViewMode);
  const setMergeDialogOpen = useUiStore((s) => s.setMergeDialogOpen);
  const setSplitExtractDialog = useUiStore((s) => s.setSplitExtractDialog);
  const setToolDialog = useUiStore((s) => s.setToolDialog);
  const bumpRefresh = useUiStore((s) => s.bumpRefresh);
  const getActiveTab = usePdfStore((s) => s.getActiveTab);

  const handleFlatten = async () => {
    const tab = getActiveTab();
    if (!tab) return;
    const out = await saveDialog({
      defaultPath: tab.path.replace(/\.pdf$/i, "-aplanado.pdf"),
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!out) return;
    try {
      // 1) Embed standard annotations (highlight, underline, note, etc.)
      await embedAnnotationsIntoPdf(tab.path, out);

      // 2) For freetext + image annotations, embed as real PDF objects.
      const sidecar = await loadAnnotations(tab.path);
      const freetexts = sidecar.annotations.filter(
        (a) => a.type === "freetext"
      );
      const images = sidecar.annotations.filter((a) => a.type === "image");

      if (freetexts.length > 0 || images.length > 0) {
        const pagesInfo = await getPagesInfo(tab.path);
        const heightByPage: Record<number, number> = {};
        for (const p of pagesInfo) {
          heightByPage[p.pageNumber] = p.height;
        }
        for (const a of freetexts) {
          const d = a.data as {
            font?: string;
            size?: number;
            bold?: boolean;
            italic?: boolean;
            color?: string;
            ttfPath?: string | null;
            familyFallback?: "helvetica" | "times" | "courier";
          };
          const [x1, y1] = a.rect;
          const pageHeight = heightByPage[a.page] ?? 842;
          const size = d?.size ?? 14;
          // Overlay Y is top-down. PDF Y is bottom-up. Text anchor is
          // baseline; we want the text to appear starting at y1 from top.
          const pdfY = pageHeight - y1 - size;
          const [r, g, b] = [
            parseInt((d?.color ?? "#000000").slice(1, 3), 16) || 0,
            parseInt((d?.color ?? "#000000").slice(3, 5), 16) || 0,
            parseInt((d?.color ?? "#000000").slice(5, 7), 16) || 0,
          ];
          await addFormattedText({
            inputPath: out,
            outputPath: out,
            pageIndex: a.page,
            text: a.text ?? "",
            x: x1,
            y: pdfY,
            fontSize: size,
            color: [r, g, b],
            ttfPath: d?.ttfPath ?? null,
            familyFallback: d?.familyFallback ?? "helvetica",
            bold: d?.bold ?? false,
            italic: d?.italic ?? false,
          });
        }

        // Embed images as real PDF image objects.
        for (const a of images) {
          const d = a.data as { imagePath?: string } | undefined;
          if (!d?.imagePath) continue;
          const [x1, y1, x2, y2] = a.rect;
          const pageHeight = heightByPage[a.page] ?? 842;
          const w = x2 - x1;
          const h = y2 - y1;
          // Convert top-left overlay coord to PDF bottom-left.
          const pdfBottom = pageHeight - y2;
          await stampImage(out, out, a.page, d.imagePath, x1, pdfBottom, w, h);
        }
      }
      alert(
        `PDF aplanado guardado en:\n${out}\n\n${freetexts.length} texto(s) y ${images.length} imagen(es) embebido(s).`
      );
    } catch (e) {
      alert(`Error: ${e}`);
    }
  };

  const handleApplyRedactions = async () => {
    const tab = getActiveTab();
    if (!tab) return;
    const sidecar = await loadAnnotations(tab.path);
    const rects: RedactRect[] = sidecar.annotations
      .filter(
        (a) =>
          a.type === "rect" &&
          (a.category === "REDACT" ||
            a.category === "Redactar" ||
            a.category?.toUpperCase() === "REDACT")
      )
      .map((a) => ({
        page: a.page,
        left: a.rect[0],
        bottom: a.rect[1],
        right: a.rect[2],
        top: a.rect[3],
      }));
    if (rects.length === 0) {
      alert(
        'No hay rectángulos con categoría "REDACT". Usa la herramienta de caja (rect) y asigna la categoría "REDACT" antes de aplicar redacciones.'
      );
      return;
    }
    const out = await saveDialog({
      defaultPath: tab.path.replace(/\.pdf$/i, "-redactado.pdf"),
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!out) return;
    try {
      await redactPdf(tab.path, out, rects);
      alert(
        `${rects.length} redacciones aplicadas. Guardado en:\n${out}\n\nNOTA: Esta es redacción visual (cubre con negro). Para borrado forense del texto subyacente, exporta las páginas como imagen y vuelve a armar el PDF.`
      );
    } catch (e) {
      alert(`Error: ${e}`);
    }
  };

  const handleExtractText = async () => {
    const tab = getActiveTab();
    if (!tab) return;
    const out = await saveDialog({
      defaultPath: tab.path.replace(/\.pdf$/i, ".txt"),
      filters: [{ name: "Texto", extensions: ["txt", "md"] }],
    });
    if (!out) return;
    try {
      await extractTextToFile(tab.path, out);
      alert(`Texto guardado en:\n${out}`);
    } catch (e) {
      alert(`Error: ${e}`);
    }
  };

  const handleSaveAs = async () => {
    const tab = getActiveTab();
    if (!tab) return;
    const out = await saveDialog({
      defaultPath: tab.path.replace(/\.pdf$/i, "-copia.pdf"),
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!out) return;
    try {
      await savePdfBackup(tab.path, out);
      alert(`Copia guardada en:\n${out}`);
    } catch (e) {
      alert(`Error: ${e}`);
    }
  };

  const handlePrint = async () => {
    const tab = getActiveTab();
    if (!tab) return;
    try {
      await printPdf(tab.path);
    } catch (e) {
      alert(`Error al imprimir: ${e}`);
    }
  };

  const handleRotateAll = async (degrees: number) => {
    const tab = getActiveTab();
    if (!tab) return;
    if (!confirm(`Rotar TODAS las páginas ${degrees}°? Se crea backup .bak.`))
      return;
    try {
      await saveVersion(tab.path);
      await savePdfBackup(tab.path, tab.path + ".bak");
      await rotateDocument(tab.path, tab.path, degrees);
      bumpRefresh();
    } catch (e) {
      alert(`Error: ${e}`);
    }
  };

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            Archivo
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onOpen}>
            Abrir...
            <DropdownMenuShortcut>Ctrl+O</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSaveAs} disabled={!activeTabId}>
            Guardar como copia...
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePrint} disabled={!activeTabId}>
            Imprimir...
            <DropdownMenuShortcut>Ctrl+P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setMergeDialogOpen(true)}>
            Combinar PDFs...
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setSplitExtractDialog("extract")}
            disabled={!activeTabId}
          >
            Extraer páginas...
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setSplitExtractDialog("split")}
            disabled={!activeTabId}
          >
            Dividir PDF...
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setToolDialog("imagesToPdf")}>
            Crear PDF desde imágenes...
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setToolDialog("exportImages")}
            disabled={!activeTabId}
          >
            Exportar páginas como imágenes...
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setToolDialog("compress")}
            disabled={!activeTabId}
          >
            Comprimir PDF...
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setToolDialog("metadata")}
            disabled={!activeTabId}
          >
            Propiedades del documento...
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleFlatten}
            disabled={!activeTabId}
          >
            Guardar con anotaciones embebidas...
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleExtractText}
            disabled={!activeTabId}
          >
            Extraer texto a archivo...
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setToolDialog("password")}
            disabled={!activeTabId}
          >
            Seguridad / contraseña...
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleRotateAll(90)}
            disabled={!activeTabId}
          >
            Rotar todo el documento 90°
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleRotateAll(-90)}
            disabled={!activeTabId}
          >
            Rotar todo el documento -90°
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleRotateAll(180)}
            disabled={!activeTabId}
          >
            Rotar todo el documento 180°
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => activeTabId && closeTab(activeTabId)}
            disabled={!activeTabId}
          >
            Cerrar pestaña
            <DropdownMenuShortcut>Ctrl+W</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            Editar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={() => setToolDialog("versions")}
            disabled={!activeTabId}
          >
            Historial de versiones...
            <DropdownMenuShortcut>Ctrl+Z</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setToolDialog("addText")}
            disabled={!activeTabId}
          >
            Añadir texto (con fuente/tamaño/color)...
            <DropdownMenuShortcut>Ctrl+T</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSearch}>
            Buscar...
            <DropdownMenuShortcut>Ctrl+F</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setToolDialog("goto")}
            disabled={!activeTabId}
          >
            Ir a página...
            <DropdownMenuShortcut>Ctrl+G</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setToolDialog("watermark")}
            disabled={!activeTabId}
          >
            Marca de agua...
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setToolDialog("pageNumbers")}
            disabled={!activeTabId}
          >
            Números de página...
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setToolDialog("crop")}
            disabled={!activeTabId}
          >
            Recortar márgenes...
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setToolDialog("bookmarks")}
            disabled={!activeTabId}
          >
            Editar marcadores (TOC)...
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setToolDialog("comparePdf")}
            disabled={!activeTabId}
          >
            Comparar con otro PDF...
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setToolDialog("formFields")}
            disabled={!activeTabId}
          >
            Campos de formulario...
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleApplyRedactions}
            disabled={!activeTabId}
          >
            Aplicar redacciones (rects categoría REDACT)...
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setToolDialog("ocr")}
            disabled={!activeTabId}
          >
            OCR (requiere Tesseract)...
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setToolDialog("ai")}
            disabled={!activeTabId}
          >
            Preguntar a Claude (IA)...
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setToolDialog("stamp")}
            disabled={!activeTabId}
          >
            Estampar imagen / firma...
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setToolDialog("stampPreset")}
            disabled={!activeTabId}
          >
            Sello de texto (APROBADO, etc.)...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            Ver
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={toggleSidebar}>
            Alternar barra lateral
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleReadingMode}>
            Modo lectura
            <DropdownMenuShortcut>F11</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleDarkMode}>
            {darkMode ? "Desactivar modo oscuro" : "Activar modo oscuro"}
            <DropdownMenuShortcut>Ctrl+Shift+D</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={togglePresentation}>
            Modo presentación
            <DropdownMenuShortcut>Ctrl+L</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setViewMode("single")}>
            Una página
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setViewMode("double")}>
            Dos páginas
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setViewMode("continuous")}>
            Continuo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            Ayuda
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setToolDialog("shortcuts")}>
            Atajos de teclado
            <DropdownMenuShortcut>F1</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setToolDialog("about")}>
            Acerca de AirPDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
