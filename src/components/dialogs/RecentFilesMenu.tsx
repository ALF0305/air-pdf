import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Clock, Trash2 } from "lucide-react";
import {
  getRecentFiles,
  clearRecentFiles,
  type RecentFile,
} from "@/lib/tauri";
import { openPdfFlow } from "@/lib/openPdfFlow";
import { usePdfStore } from "@/stores/pdfStore";

export function RecentFilesMenu() {
  const [recent, setRecent] = useState<RecentFile[]>([]);
  const addTab = usePdfStore((s) => s.addTab);

  const refresh = async () => {
    try {
      setRecent(await getRecentFiles());
    } catch {
      setRecent([]);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleClick = async (path: string) => {
    const doc = await openPdfFlow(path);
    if (doc) {
      addTab(doc);
      await refresh();
    }
  };

  const handleClear = async () => {
    if (!confirm("¿Limpiar lista de archivos recientes?")) return;
    await clearRecentFiles();
    await refresh();
  };

  return (
    <DropdownMenu onOpenChange={(o) => o && refresh()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Clock className="h-4 w-4" />
          Recientes
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[480px] max-h-[400px] overflow-auto">
        {recent.length === 0 ? (
          <div className="p-2 text-sm text-muted-foreground">
            Sin archivos recientes
          </div>
        ) : (
          <>
            {recent.map((f) => {
              const filename = f.path.split(/[\\/]/).pop() ?? f.path;
              return (
                <DropdownMenuItem key={f.path} onClick={() => handleClick(f.path)}>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate font-medium">{filename}</span>
                    <span
                      className="truncate text-xs text-muted-foreground"
                      title={f.path}
                    >
                      {f.path}
                    </span>
                  </div>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleClear} className="text-destructive">
              <Trash2 className="h-3 w-3" />
              Limpiar lista
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
