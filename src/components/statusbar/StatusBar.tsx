import { useModeStore } from "@/stores/modeStore";
import { usePdfStore } from "@/stores/pdfStore";
import { useEffect } from "react";
import { Sparkles, Cloud, Cpu, CloudOff } from "lucide-react";

function ModeBadge() {
  const mode = useModeStore((s) => s.mode);
  const detected = useModeStore((s) => s.detected);
  const detect = useModeStore((s) => s.detect);

  useEffect(() => {
    if (!detected) detect();
  }, [detect, detected]);

  switch (mode.type) {
    case "pro":
      return (
        <span
          className="flex items-center gap-1 text-xs text-primary"
          title="Claude Code detectado"
        >
          <Sparkles className="h-3 w-3" /> Modo Pro ({mode.version})
        </span>
      );
    case "cloud-only":
      return (
        <span
          className="flex items-center gap-1 text-xs"
          title="ANTHROPIC_API_KEY configurada"
        >
          <Cloud className="h-3 w-3" /> IA Cloud
        </span>
      );
    case "local-only":
      return (
        <span
          className="flex items-center gap-1 text-xs"
          title="Ollama corriendo en localhost:11434"
        >
          <Cpu className="h-3 w-3" /> IA Local (Ollama)
        </span>
      );
    case "none":
      return (
        <span
          className="flex items-center gap-1 text-xs text-muted-foreground"
          title="Sin IA disponible"
        >
          <CloudOff className="h-3 w-3" /> Sin IA
        </span>
      );
  }
}

export function StatusBar() {
  const activeTab = usePdfStore((s) => s.getActiveTab());
  const currentPage = usePdfStore((s) => s.currentPage);

  const filename = activeTab
    ? activeTab.path.split(/[\\/]/).pop() ?? activeTab.path
    : null;

  return (
    <footer className="border-t px-3 py-1 flex items-center justify-between text-xs text-muted-foreground bg-muted/10">
      <div className="truncate">
        {activeTab
          ? `${filename} — Pág ${currentPage + 1} / ${activeTab.pageCount}`
          : "Sin documento abierto"}
      </div>
      <ModeBadge />
    </footer>
  );
}
