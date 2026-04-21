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

export function AboutDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>AirPDF</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p>
            Lector y editor de PDFs local-first para Windows. Todas las
            operaciones se ejecutan en tu PC, sin telemetría ni servicios
            remotos.
          </p>
          <p className="font-semibold">Incluye:</p>
          <ul className="list-disc pl-5 space-y-0.5 text-xs">
            <li>Lectura con búsqueda, zoom, modo lectura, vista continua</li>
            <li>Anotaciones (resalte, subrayado, dibujo, notas, cajas)</li>
            <li>Operaciones de página: rotar, eliminar, duplicar, extraer,
              dividir, combinar, reordenar, insertar en blanco</li>
            <li>PDF ↔ imágenes (PNG/JPG)</li>
            <li>Marca de agua, números de página, recorte, rotación global</li>
            <li>Metadatos, compresión, versiones, backups .bak</li>
            <li>Estampar imagen/firma, extraer texto</li>
            <li>Autoguardado de snapshots cada 5 min</li>
          </ul>
          <p className="text-xs text-muted-foreground pt-2">
            Stack: Tauri 2 + React + TypeScript + PDFium + lopdf
          </p>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
