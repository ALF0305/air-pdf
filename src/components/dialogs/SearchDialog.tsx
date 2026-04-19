import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePdfStore } from "@/stores/pdfStore";
import { useUiStore } from "@/stores/uiStore";
import { searchInPdf } from "@/lib/tauri";
import type { SearchResult } from "@/types/pdf";
import { useState } from "react";

export function SearchDialog() {
  const open = useUiStore((s) => s.searchDialogOpen);
  const setOpen = useUiStore((s) => s.setSearchDialogOpen);
  const activeTab = usePdfStore((s) => s.getActiveTab());
  const setCurrentPage = usePdfStore((s) => s.setCurrentPage);
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!activeTab || !query.trim()) return;
    setSearching(true);
    try {
      const r = await searchInPdf(activeTab.path, query, caseSensitive);
      setResults(r);
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buscar en PDF</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Texto a buscar..."
            autoFocus
          />
          <Button onClick={handleSearch} disabled={searching || !query.trim()}>
            {searching ? "Buscando..." : "Buscar"}
          </Button>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
          />
          Distinguir mayusculas
        </label>
        <ScrollArea className="h-72 border rounded">
          {results.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              {searching ? "Buscando..." : query ? "Sin resultados" : "Escribi algo y presiona Buscar"}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              <div className="text-xs text-muted-foreground mb-2 px-2">
                {results.length} resultado{results.length !== 1 ? "s" : ""}
              </div>
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentPage(r.page);
                    setOpen(false);
                  }}
                  className="w-full text-left p-2 hover:bg-accent rounded text-sm"
                >
                  <div className="text-xs text-muted-foreground">
                    Pagina {r.page + 1}
                  </div>
                  <div className="truncate">{r.context}</div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
