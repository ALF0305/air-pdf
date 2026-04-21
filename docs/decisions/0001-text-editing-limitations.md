# ADR 0001 — Edicion de texto existente: alcance limitado en Fase 1

- Estado: Aceptado
- Fecha: 2026-04-20
- Relacionado: plan 1.3 (T53-T55), Fase 4 del overview

## Contexto

El modelo de contenido de un PDF NO es un flujo de texto editable.
Cada pagina tiene un content stream con operadores graficos
(`BT`/`ET`, `Tj`, `TJ`, `Tm`, fuentes embebidas con codificaciones
custom, kerning por palabra). Editar una palabra "en el lugar" implica:

1. Parsear el content stream y reconocer donde cae la palabra objetivo
   considerando encoding (ToUnicode CMap), subsetting y posicionamiento
   manual por caracter.
2. Medir el ancho nuevo con la fuente original (que puede ser un subset
   sin los glyphs necesarios) y reflowar el resto de la linea.
3. Recomponer el stream respetando posicionamiento o ajustando
   coordenadas subsiguientes.
4. En muchos casos, re-embeber la fuente con un nuevo subset.

Esto requiere un motor de layout PDF completo (similar a PDFtron o
Foxit SDK). No es factible con lopdf + pdfium-render ni con el alcance
de Fase 1.

## Decision

En Fase 1 AirPDF expone "edicion ligera":

- **Tachar** texto existente via anotacion `strikethrough`.
- **Cubrir** texto existente via redaction (rectangulos negros opacos
  aplicados con `apply_redactions`).
- **Agregar** texto nuevo en posiciones vacias via
  `pdf_add_formatted_text` (dibuja un text object nuevo usando fuentes
  del sistema enumeradas con `pdf_list_system_fonts`).
- **No reemplazar** inline con reflow ni re-editar texto existente.

La herramienta "addText" en AnnotationToolbar (T54) usa el editor
in-canvas `FreeTextEditor` para colocar el texto y al guardar llama a
`pdf_add_formatted_text`.

## Consecuencias

### Aceptadas

- Cubrimos 90% de los casos reales del flujo clinico (tachar dato
  erroneo, agregar aclaracion, firmar, redactar campos sensibles).
- El backend queda simple: lopdf + operaciones aditivas.
- Tiempos de implementacion acordes a una version 0.x.

### Deuda explicita (Fase 4)

- Reemplazo inline con reflow de texto.
- Edicion de tablas existentes.
- Re-embebido parcial de fuentes.
- Require integrar un motor mas completo (candidatos: pdfium PDF
  editing APIs directas, mupdf, o un fork propio basado en el
  content-stream parser de lopdf).

## Alternativas consideradas

- **Usar mupdf-sys**: su API de edicion es mas capaz pero es AGPL,
  incompatible con el MIT del proyecto salvo licencia comercial.
- **Pagar PDFtron SDK**: resuelve el problema pero cuesta miles
  USD/ano y va contra el espiritu local-first/open del proyecto.
- **Rasterizar y rehacer**: perderia selectividad de texto y
  accesibilidad.

Se elige el camino "lightweight + redact + add" y se documenta la
limitacion al usuario en la UI (tooltip del tool addText + mensaje
explicativo en la pagina "Acerca de").
