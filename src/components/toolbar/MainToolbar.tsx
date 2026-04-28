import { Button } from "@/components/ui/button";
import {
  RotateCw,
  RotateCcw,
  Scissors,
  Trash2,
  Copy,
  FilePlus,
  Printer,
} from "lucide-react";
import { usePdfStore } from "@/stores/pdfStore";
import { useUiStore } from "@/stores/uiStore";
import {
  rotatePages,
  extractPages,
  deletePages,
  duplicatePage,
  insertBlankPage,
  savePdfBackup,
  saveVersion,
  printPdf,
} from "@/lib/tauri";
import { save } from "@tauri-apps/plugin-dialog";

export function MainToolbar() {
  const activeTab = usePdfStore((s) => s.getActiveTab());
  const currentPage = usePdfStore((s) => s.currentPage);
  const bumpRefresh = useUiStore((s) => s.bumpRefresh);

  const rotate = async (degrees: number) => {
    if (!activeTab) return;
    if (
      !confirm(
        `Rotar página ${currentPage + 1} ${degrees > 0 ? "→" : "←"}? Se crea backup .bak.`
      )
    )
      return;

    try {
      await saveVersion(activeTab.path);
      await savePdfBackup(activeTab.path, activeTab.path + ".bak");
      await rotatePages(activeTab.path, activeTab.path, [currentPage], degrees);
      bumpRefresh();
    } catch (e) {
      alert(`Error rotando: ${e}`);
    }
  };

  const extractCurrent = async () => {
    if (!activeTab) return;
    const target = await save({
      defaultPath: activeTab.path.replace(
        /\.pdf$/i,
        `-pagina-${currentPage + 1}.pdf`
      ),
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!target) return;
    try {
      await extractPages(activeTab.path, target, [currentPage]);
      alert(`Extraída a: ${target}`);
    } catch (e) {
      alert(`Error extrayendo: ${e}`);
    }
  };

  const deleteCurrent = async () => {
    if (!activeTab) return;
    if (activeTab.pageCount <= 1) {
      alert("No se puede eliminar la única página");
      return;
    }
    if (
      !confirm(
        `¿Eliminar página ${currentPage + 1}? Se crea backup .bak antes.`
      )
    )
      return;

    try {
      await saveVersion(activeTab.path);
      await savePdfBackup(activeTab.path, activeTab.path + ".bak");
      await deletePages(activeTab.path, activeTab.path, [currentPage]);
      bumpRefresh();
    } catch (e) {
      alert(`Error eliminando: ${e}`);
    }
  };

  const duplicateCurrent = async () => {
    if (!activeTab) return;
    if (!confirm(`Duplicar página ${currentPage + 1}? Se crea backup .bak.`))
      return;
    try {
      await saveVersion(activeTab.path);
      await savePdfBackup(activeTab.path, activeTab.path + ".bak");
      await duplicatePage(activeTab.path, activeTab.path, currentPage);
      bumpRefresh();
    } catch (e) {
      alert(`Error duplicando: ${e}`);
    }
  };

  const insertBlankAfter = async () => {
    if (!activeTab) return;
    if (
      !confirm(
        `Insertar página en blanco después de la página ${currentPage + 1}? Se crea backup .bak.`
      )
    )
      return;
    try {
      await saveVersion(activeTab.path);
      await savePdfBackup(activeTab.path, activeTab.path + ".bak");
      await insertBlankPage(activeTab.path, activeTab.path, currentPage + 1);
      bumpRefresh();
    } catch (e) {
      alert(`Error insertando: ${e}`);
    }
  };

  if (!activeTab) return null;

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => rotate(-90)}
        title="Rotar izquierda 90°"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => rotate(90)}
        title="Rotar derecha 90°"
      >
        <RotateCw className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={duplicateCurrent}
        title="Duplicar página actual"
      >
        <Copy className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={insertBlankAfter}
        title="Insertar página en blanco después"
      >
        <FilePlus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={extractCurrent}
        title="Extraer página actual a PDF nuevo"
      >
        <Scissors className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={deleteCurrent}
        title="Eliminar página actual"
        className="text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        variant="ghost"
        size="icon"
        onClick={async () => {
          if (!activeTab) return;
          try {
            await printPdf(activeTab.path);
          } catch (e) {
            alert(`Error al imprimir: ${e}`);
          }
        }}
        title="Imprimir... (Ctrl+P)"
      >
        <Printer className="h-4 w-4" />
      </Button>
    </div>
  );
}
