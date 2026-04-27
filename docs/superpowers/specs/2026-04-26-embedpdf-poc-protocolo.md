# Spec: Protocolo de evaluacion de EmbedPDF como visor

**Fecha:** 2026-04-26
**Sub-plan origen:** 2.0.C del plan de evaluacion OSS (v0.4)
**Status:** Listo para ejecutar. Requiere presencia del usuario para medir
y decidir GO/NO-GO.

## Contexto

Hoy el visor de air-pdf usa `pdfjs-dist` v4 (PDF.js de Mozilla, Apache-2.0).
Funciona y esta integrado, pero el render no siempre coincide al 100% con
lo que produce el backend (PDFium via `pdfium-render`), causando friccion
cuando el usuario edita y guarda.

EmbedPDF (https://github.com/embedpdf/embed-pdf-viewer, MIT, ~3.9k stars)
compila PDFium a WebAssembly, asi que **el visor usaria el mismo motor que
el backend**. Beneficios potenciales: render consistente, mejor fidelidad
de fuentes, anotaciones y redaccion ya implementadas en el plugin tree.

Riesgo: bundle ~4-6 MB extra (WASM), curva de aprendizaje, regresiones
en flujos que ya pasan tests.

## Objetivo de este spike

Decidir GO o NO-GO con criterios cuantitativos, NO con intuicion. Al
final del spike se firma un ADR `0003-visor-pdf.md`.

## Setup (5 min)

```powershell
cd "D:\Dropbox\Claude Code\air-pdf"
git checkout main
git pull
git checkout -b spike/v0.4-embedpdf-viewer
pnpm add @embedpdf/core @embedpdf/plugin-loader @embedpdf/plugin-render @embedpdf/plugin-viewport @embedpdf/plugin-scroll @embedpdf/plugin-zoom
# si Vite se queja por wasm, anadir @embedpdf/wasm como dep separada
```

Verificar el package.json y registrar el bundle size delta:
```powershell
pnpm build
# anotar tamano de dist/ antes y despues de la dep
```

## Pagina de spike

Crear `src/pages/SpikeEmbedPdf.tsx` (NO ruta publica, solo accesible
manualmente al editar el router temporalmente):

```tsx
// Componente minimo que carga un PDF de prueba con EmbedPDF.
// Solo para spike, NO se integra con el resto de la app.
import { useEffect, useRef } from 'react';
import { /* APIs de EmbedPDF segun docs actuales */ } from '@embedpdf/core';

export function SpikeEmbedPdf() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // Inicializar viewer con plugins minimos: render, viewport, scroll, zoom
    // Cargar /tests/fixtures/sample.pdf (o un fixture existente)
    // ... codigo segun docs.embedpdf.com
  }, []);

  return <div ref={containerRef} className="w-full h-screen" />;
}
```

Anadir una ruta temporal en `App.tsx` o el router actual (eliminarla al
terminar el spike).

## Tests a ejecutar

Usar 3 PDFs representativos:

1. **paper-academico.pdf** (~30 paginas, mucho texto, formulas, fuentes
   embebidas)
2. **expediente-clinico.pdf** (~80 paginas escaneadas con OCR previo)
3. **brochure-comercial.pdf** (~5 paginas con muchas imagenes y graficos
   vectoriales)

Para cada uno medir:

| Metrica | Como medir | PDF.js (baseline) | EmbedPDF | Delta |
|---|---|---|---|---|
| Bundle size adicional | `pnpm build` antes y despues | — | __ | __ |
| RAM en idle (1 PDF abierto) | Task Manager > air-pdf.exe | __ | __ | __ |
| Tiempo a primer render (TTFR) | `performance.now()` en la pagina spike | __ | __ | __ |
| Scroll 60 fps en doc 80 pags | Chrome DevTools > Performance > FPS | __ | __ | __ |
| Render fiel vs PDFium backend | Comparar visualmente con `pdf_export_page_image` del backend | __ | __ | __ |
| Fuentes raras (no Helvetica) | Visual diff | __ | __ | __ |

Anotar resultados en este mismo archivo bajo seccion "Resultados".

## Criterios GO / NO-GO

GO si **todas** se cumplen:

1. Bundle size adicional <= 6 MB (sin gzip).
2. TTFR <= 1.5x el de PDF.js para los 3 PDFs de prueba.
3. Scroll mantiene >= 50 fps en el PDF de 80 paginas en una PC de gama
   media (no necesario benchmark en la PC del usuario; basta que la suya
   no se sienta peor que ahora).
4. Render visual subjetivamente igual o mejor que PDF.js segun Alfredo.
5. La API es estable (release reciente, no bleeding-edge).
6. Encontramos manera de cargar PDFs desde memoria (los PDFs en tabs
   ya se cargaron por el backend, no queremos doble fetch).

NO-GO si cualquiera falla. En ese caso documentar en el ADR las
metricas reales y mantener PDF.js.

## Diferimiento si GO

Si la decision es GO, NO se migra en este spike. El spike solo decide.
La migracion real seria un nuevo plan (Plan 2.1 o 3.0) con:

- Refactor del wrapper actual `src/lib/pdf-viewer/` (si existe; si no,
  crearlo) para abstraer el motor
- Migracion gradual: convivencia de ambos motores con flag de feature
- Tests E2E que cubran los flujos de anotaciones, busqueda, etc.
- Deprecacion de `pdfjs-dist`

## Limpieza al terminar

```powershell
# Si NO-GO:
git checkout main
git branch -D spike/v0.4-embedpdf-viewer
# Restaurar package.json (las deps de EmbedPDF se eliminan automaticamente
# al borrar la rama)

# Si GO:
git checkout main
# Crear ADR 0003-visor-pdf.md decidiendo GO con metricas
# Mergear el spike opcionalmente o dejarlo como referencia y abrir
# nueva rama para el plan de migracion
```

## Resultados

(Llenar al ejecutar el spike)

| Metrica | PDF.js | EmbedPDF | Delta | Veredicto |
|---|---|---|---|---|
| Bundle size | __ | __ | __ | __ |
| RAM idle | __ | __ | __ | __ |
| TTFR paper | __ | __ | __ | __ |
| TTFR expediente | __ | __ | __ | __ |
| TTFR brochure | __ | __ | __ | __ |
| Scroll fps | __ | __ | __ | __ |
| Render fidelity | __ | __ | __ | __ |

**Decision final:** [GO / NO-GO] — fecha, firma.

## Riesgos del spike (no del producto)

- El primer build con WASM puede tardar bastante. Tener paciencia y
  no cancelar.
- Vite puede requerir config para servir `.wasm` con MIME type
  correcto. Documentar el ajuste en este archivo si es necesario.
- Los plugins de EmbedPDF estan en evolucion activa. Pin de version
  exacta (no `^`) durante el spike para reproducibilidad.

## Referencias

- EmbedPDF home: https://www.embedpdf.com/
- EmbedPDF GitHub: https://github.com/embedpdf/embed-pdf-viewer
- EmbedPDF docs: https://docs.embedpdf.com/
- Spec origen Plan 2.0: `docs/superpowers/plans/2026-04-26-air-pdf-plan-2.0-evaluacion-componentes-oss.md`
