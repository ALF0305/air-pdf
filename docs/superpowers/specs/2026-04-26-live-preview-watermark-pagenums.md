# Spec: Live preview de marca de agua y numeros de pagina

**Fecha:** 2026-04-26
**Sub-plan origen:** 2.0.D del plan de evaluacion OSS (v0.4)
**Status:** Listo para implementar. UI puro, sin nuevas dependencias.

## Problema

Hoy `WatermarkDialog.tsx` y `PageNumbersDialog.tsx` son formularios sin
preview. El usuario llena los campos y aplica a ciegas. Si el resultado
no es el esperado, debe deshacer (o restaurar desde el `.bak` automatico),
ajustar y reintentar. Esto es lento y frustrante en PDFs grandes.

El backlog v0.3.0 lo declaro explicitamente diferido:

> Live preview de watermark/números de página

## Objetivo

Mostrar en tiempo real, sobre la pagina actualmente visible en el viewer,
una capa overlay HTML/CSS que simula como quedaria el watermark o el
numero de pagina con los parametros del formulario, ANTES de aplicar el
cambio destructivo al PDF.

## No-objetivos

- No es un editor WYSIWYG real sobre el PDF. El render verdadero lo sigue
  haciendo el backend (PDFium/lopdf) al aplicar.
- No se persiste nada hasta que el usuario presiona "Aplicar".
- Solo se previsualiza en la pagina actualmente en pantalla, no en
  thumbnails ni en otras paginas.

## Alcance

### A. WatermarkDialog

Hoy:
- Formulario con texto, tamano, opacidad.
- "Aplicar" ejecuta `watermarkPdf` sobre el archivo.

Cambios propuestos:

1. Agregar al store `uiStore` (o a un nuevo `previewStore` si crece) un
   estado opcional `watermarkPreview: { text, fontSize, opacity } | null`.
2. Mientras el dialog esta abierto, sincronizar ese estado con los
   inputs en cada cambio (debounce ~80ms para no spamear).
3. En el componente `PdfPage` (o el contenedor del viewer), si
   `watermarkPreview` no es null, renderizar un div absolute overlay:
   - Diagonal 45deg
   - Color rojo configurable
   - Opacity del slider
   - Tamano de fuente proporcional al zoom actual
   - `pointer-events: none` para no interferir con anotaciones
   - Position centrado en el viewport de la pagina
4. Al cerrar el dialog (cancel o aplicar), limpiar `watermarkPreview`.
5. El "Aplicar" hace exactamente lo que ya hace hoy.

### B. PageNumbersDialog

Hoy: similar al watermark, formulario para formato + posicion + tamano.

Cambios propuestos:

1. `pageNumberPreview: { format, position, fontSize, fontColor } | null`.
2. Overlay HTML en la posicion correspondiente (top-left, top-center,
   etc.) con el formato resuelto (`{n}` -> numero pagina actual,
   `{total}` -> total de paginas del documento).
3. Position usar coordenadas absolute relativas al canvas del PDF.

## Detalles tecnicos

### Componente nuevo: `<PageOverlay />`

Ubicacion: `src/components/viewer/PageOverlay.tsx`.

Responsabilidad: renderizar overlays HTML por encima del canvas de la
pagina. Lee del `uiStore` los previews activos. Multiple overlays
soportados (watermark + numero al mismo tiempo).

```tsx
interface OverlayProps {
  pageWidthPx: number;   // ancho del canvas en pixeles del DOM
  pageHeightPx: number;  // alto del canvas
  zoom: number;          // factor de zoom actual
  pageNumber: number;    // 1-indexed
  totalPages: number;
}
```

### Donde montarlo

En `PdfPage.tsx` (o el componente que renderiza cada pagina del visor),
inmediatamente despues del `<canvas>` y dentro del mismo wrapper
`position: relative`.

### Conversion de unidades

PDF watermark backend usa puntos (1pt = 1/72 inch). El preview HTML usa
pixeles del DOM. Conversion:

```ts
const pixelsPerPoint = (canvas.width / pdfPageWidthPoints) // ya conocido por el viewer
const previewFontSizePx = fontSizePt * pixelsPerPoint;
```

Asi el preview escala correctamente al hacer zoom.

### Debounce

Los inputs numericos disparan onChange en cada keystroke. Para evitar
re-render del overlay 60 veces por segundo:

```ts
const debouncedSync = useMemo(
  () => debounce(syncPreviewToStore, 80),
  []
);
```

### Cleanup

Al desmontarse el dialog (cualquier razon), llamar
`setWatermarkPreview(null)` y `setPageNumberPreview(null)`. Hook:

```ts
useEffect(() => () => clearAllPreviews(), []);
```

## Tareas de implementacion

| # | Task | Archivos |
|---|---|---|
| D1 | Anadir slices `watermarkPreview` y `pageNumberPreview` al `uiStore` | `src/stores/uiStore.ts` |
| D2 | Crear `<PageOverlay />` con render condicional de cada overlay | `src/components/viewer/PageOverlay.tsx` (nuevo) |
| D3 | Integrar `<PageOverlay />` en `PdfPage.tsx` (o equivalente) | `src/components/viewer/PdfPage.tsx` |
| D4 | Modificar `WatermarkDialog` para sincronizar preview en cada onChange (debounced) y limpiar al cerrar | `src/components/dialogs/WatermarkDialog.tsx` |
| D5 | Modificar `PageNumbersDialog` igual | `src/components/dialogs/PageNumbersDialog.tsx` |
| D6 | Tests Vitest del overlay (snapshot + props) | `src/components/viewer/__tests__/PageOverlay.test.tsx` |
| D7 | QA manual: confirmar que el overlay desaparece en cancel, aplica, y al hacer zoom | manual |

## Definition of done

- Abrir el dialog de watermark muestra el texto sobre la pagina mientras
  se editan los campos. Cambiar el slider de opacidad actualiza el
  overlay sin lag perceptible.
- Cerrar con cancel deja la pagina como estaba (sin overlay residual).
- Aplicar hace lo que hoy y luego cierra el dialog (sin overlay residual).
- Igual para numeros de pagina.
- Suite Vitest: tests nuevos pasan + 7 anteriores siguen pasando.

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
|---|---|
| Overlay desincronizado con la pagina al hacer scroll | Adjuntar overlay como hijo directo del wrapper de cada pagina, no global |
| Performance en PDFs muy grandes con muchas paginas visibles | Solo renderizar overlay en paginas dentro del viewport (ya hay IntersectionObserver) |
| Tipografia HTML no coincide exactamente con la del backend | Documentar como "preview aproximado". El render real lo hace el backend al aplicar |
| Zoom rapido produce flicker | useMemo en los calculos de overlay; transiciones CSS suaves |

## Diferencias con el render real (que documentar al usuario)

- Color: el backend usa rojo fijo (#FF0000). El preview tambien.
- Fuente: el backend usa Helvetica embebida. El preview usa la fuente
  por defecto del SO. Pueden verse ligeras diferencias de ancho.
- Antialiasing: el render PDF puede ser ligeramente mas nitido.

## Estimacion

UI pura, sin cambios de backend. Estimacion del autor del spec: 1-2
sesiones de trabajo. No bloquea ningun otro sub-plan.

## Fuera de alcance (futuro)

- Preview "live" de redaction (ya existe el dibujo de rectangulos como
  anotacion, no aplica).
- Preview de stamp de imagen (`StampImageDialog`). Se puede sumar despues
  con la misma infra de `<PageOverlay />`.
- Preview en multiples paginas a la vez (cuando se trabaja en vista
  continua). Posible mejora futura.
