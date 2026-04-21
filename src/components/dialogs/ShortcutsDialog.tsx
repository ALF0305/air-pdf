import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: [string, string][] = [
  ["Ctrl+O", "Abrir PDF"],
  ["Ctrl+W", "Cerrar pestaña"],
  ["Ctrl+F", "Buscar texto"],
  ["Ctrl+G", "Ir a página"],
  ["F11", "Modo lectura (pantalla completa)"],
  ["Esc", "Salir de modo lectura"],
  ["PageDown / →", "Página siguiente"],
  ["PageUp / ←", "Página anterior"],
  ["Ctrl+Home", "Primera página"],
  ["Ctrl+End", "Última página"],
  ["H", "Herramienta resaltado"],
  ["U", "Herramienta subrayado"],
  ["N", "Herramienta nota"],
  ["P", "Herramienta lápiz"],
  ["S", "Seleccionar anotación"],
  ["Supr", "Eliminar anotación seleccionada"],
];

export function ShortcutsDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atajos de teclado</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 text-sm max-h-[60vh] overflow-auto">
          {SHORTCUTS.map(([key, desc]) => (
            <div
              key={key}
              className="flex justify-between px-3 py-1.5 rounded hover:bg-accent/50"
            >
              <span className="text-muted-foreground">{desc}</span>
              <kbd className="px-2 py-0.5 rounded border bg-muted font-mono text-xs">
                {key}
              </kbd>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
