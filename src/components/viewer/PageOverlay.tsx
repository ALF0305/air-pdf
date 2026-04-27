import { useUiStore } from "@/stores/uiStore";

interface Props {
  /** indice 0-based de la pagina */
  pageIndex: number;
  /** total de paginas del documento (para resolver {total} en formato) */
  totalPages: number;
  /** factor de zoom actual del visor (1 = 100%) */
  scale: number;
}

/**
 * Overlay HTML que renderiza previews "live" sobre cada pagina del visor.
 *
 * Se renderiza dentro del wrapper `position: relative` de `PageRenderer`,
 * por encima del canvas y de la capa de anotaciones. NO interactuable
 * (`pointer-events: none`) para no interferir con el flujo de anotaciones.
 *
 * El render real al PDF lo hace el backend (PDFium/lopdf). Este preview
 * es una aproximacion visual:
 * - Usa fuente del sistema, el backend usa Helvetica embebida (puede
 *   haber leve diferencia de ancho de glifos).
 * - Color watermark fijo en rojo (#FF0000), igual que el backend.
 * - Color numeros de pagina en negro, igual que el backend.
 */
export function PageOverlay({ pageIndex, totalPages, scale }: Props) {
  const watermark = useUiStore((s) => s.watermarkPreview);
  const pageNumber = useUiStore((s) => s.pageNumberPreview);

  if (!watermark && !pageNumber) return null;

  return (
    <div
      className="absolute inset-0"
      style={{ pointerEvents: "none" }}
      data-testid="page-overlay"
    >
      {watermark && (
        <div
          data-testid="watermark-preview"
          className="absolute"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(-45deg)",
            color: "#FF0000",
            opacity: watermark.opacity,
            fontSize: `${watermark.fontSize * scale}px`,
            fontWeight: 700,
            whiteSpace: "nowrap",
            userSelect: "none",
          }}
        >
          {watermark.text}
        </div>
      )}

      {pageNumber && (
        <div
          data-testid="page-number-preview"
          className="absolute left-0 right-0 text-center"
          style={{
            // El backend estampa centro-inferior con margen pequeno.
            // Aproximamos con bottom 2% del alto de pagina.
            bottom: "2%",
            color: "#000000",
            fontSize: `${pageNumber.fontSize * scale}px`,
            userSelect: "none",
          }}
        >
          {resolveFormat(pageNumber.format, pageIndex + 1, totalPages)}
        </div>
      )}
    </div>
  );
}

/**
 * Resuelve los tokens {n} y {total} del formato. Acepta tambien las
 * variantes {N} y {TOTAL} por tolerancia.
 */
export function resolveFormat(
  format: string,
  pageNumber: number,
  totalPages: number
): string {
  return format
    .replace(/\{n\}/gi, String(pageNumber))
    .replace(/\{total\}/gi, String(totalPages));
}
