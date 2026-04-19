import { useAnnotationStore } from "@/stores/annotationStore";
import { usePdfStore } from "@/stores/pdfStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2, Download, FileOutput } from "lucide-react";
import { useState } from "react";
import { exportAnnotationsAsMarkdown } from "@/lib/annotations-export";
import { embedAnnotationsIntoPdf } from "@/lib/tauri";
import { save } from "@tauri-apps/plugin-dialog";

export function AnnotationsPanel() {
  const annotations = useAnnotationStore((s) => s.annotations);
  const remove = useAnnotationStore((s) => s.remove);
  const clearAll = useAnnotationStore((s) => s.clear);
  const selectedId = useAnnotationStore((s) => s.selectedId);
  const update = useAnnotationStore((s) => s.update);
  const activeTab = usePdfStore((s) => s.getActiveTab());
  const setCurrentPage = usePdfStore((s) => s.setCurrentPage);
  const [filter, setFilter] = useState<string>("all");

  const filtered =
    filter === "all"
      ? annotations
      : annotations.filter((a) => a.category === filter || a.type === filter);

  const categories = Array.from(
    new Set(annotations.map((a) => a.category).filter(Boolean) as string[])
  );

  const selectedAnn = annotations.find((a) => a.id === selectedId);

  const handleExportMd = async () => {
    if (!activeTab) return;
    if (annotations.length === 0) {
      alert("No hay anotaciones para exportar");
      return;
    }
    const ok = await exportAnnotationsAsMarkdown(annotations, activeTab.path);
    if (ok) alert("Anotaciones exportadas a Markdown");
  };

  const handleExportEmbedded = async () => {
    if (!activeTab) return;
    if (annotations.length === 0) {
      alert("No hay anotaciones para embeber");
      return;
    }
    const target = await save({
      defaultPath: activeTab.path.replace(/\.pdf$/i, "-anotado.pdf"),
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!target) return;
    try {
      await embedAnnotationsIntoPdf(activeTab.path, target);
      alert(`PDF con anotaciones embebidas guardado en:\n${target}`);
    } catch (e) {
      alert(`Error al embeber: ${e}`);
    }
  };

  const handleClearAll = async () => {
    if (annotations.length === 0) return;
    if (
      !confirm(
        `¿Eliminar las ${annotations.length} anotaciones? No se puede deshacer.`
      )
    )
      return;
    await clearAll();
  };

  if (!activeTab) {
    return (
      <div className="w-72 border-r p-4 text-sm text-muted-foreground">
        Abrí un PDF para ver anotaciones
      </div>
    );
  }

  return (
    <div className="w-72 border-r flex flex-col">
      <div className="p-2 border-b space-y-2">
        <div className="flex gap-1">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 text-sm bg-background border rounded px-2 py-1"
          >
            <option value="all">Todas ({annotations.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={handleExportMd}
            title="Exportar a Markdown (vault Obsidian)"
          >
            <Download className="h-3 w-3" />
            MD
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={handleExportEmbedded}
            title="Embeber en PDF (interoperable con Acrobat)"
          >
            <FileOutput className="h-3 w-3" />
            PDF
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive"
            onClick={handleClearAll}
            title="Borrar todas"
            disabled={annotations.length === 0}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {annotations.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">
          Sin anotaciones aún. Elegí una herramienta y marcá el PDF.
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filtered.map((a) => (
              <div
                key={a.id}
                className="p-2 border rounded hover:bg-accent cursor-pointer text-sm"
                onClick={() => setCurrentPage(a.page)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-xs font-medium"
                    style={{ color: a.color }}
                  >
                    {a.type}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("¿Eliminar anotación?")) remove(a.id);
                    }}
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {a.note && <div className="text-xs">{a.note}</div>}
                {a.text && !a.note && (
                  <div className="text-xs italic truncate">{a.text}</div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  Pág {a.page + 1} · {a.category ?? "sin categoría"}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
      {selectedAnn && (
        <div className="border-t p-2 space-y-2 bg-muted/20">
          <div className="text-xs font-semibold text-muted-foreground">
            Editar seleccionada
          </div>
          <textarea
            value={selectedAnn.note ?? ""}
            onChange={(e) => update({ ...selectedAnn, note: e.target.value })}
            className="w-full text-sm border rounded p-1 bg-background"
            rows={3}
            placeholder="Nota..."
          />
          <select
            value={selectedAnn.category ?? ""}
            onChange={(e) =>
              update({ ...selectedAnn, category: e.target.value })
            }
            className="w-full text-sm border rounded p-1 bg-background"
          >
            <option value="">Sin categoría</option>
            {[
              "Importante",
              "Revisar",
              "Dosis",
              "Diagnóstico",
              "Pregunta",
              "Cita",
              "Sello",
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
