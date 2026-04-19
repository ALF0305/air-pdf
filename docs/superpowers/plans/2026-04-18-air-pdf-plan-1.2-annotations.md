# AirPDF Plan 1.2 - Anotaciones

**Goal:** Sistema completo de anotaciones con persistencia sidecar + export Markdown/embedded.

**Dependencia:** Plan 1.1 completado.

## Mapa de Tareas (T31-T45)

| # | Task | Files |
|---|---|---|
| 31 | Schema sidecar .airpdf.json + CRUD backend | `src-tauri/storage/sidecar.rs`, `commands/annotations.rs` |
| 32 | annotationStore + wrappers frontend | `src/stores/annotationStore.ts`, `src/lib/tauri.ts` |
| 33 | AnnotationLayer overlay | `src/components/annotations/AnnotationLayer.tsx` |
| 34 | AnnotationToolbar (tools + colores + categorías) | `src/components/toolbar/AnnotationToolbar.tsx` |
| 35 | Highlight con mouse drag + usePageInteraction | `src/hooks/usePageInteraction.ts` |
| 36 | Pen tool (SVG path) | AnnotationLayer |
| 37 | Stamps (5 predefinidos) + StampPicker | `src/components/annotations/StampPicker.tsx` |
| 38 | AnnotationsPanel sidebar | `src/components/sidebar/AnnotationsPanel.tsx` |
| 39 | Export a markdown (Obsidian) | `src/lib/annotations-export.ts` |
| 40 | Embed en PDF (lopdf /Annot dict) | `src-tauri/pdf/editor.rs` |
| 41 | Atajos teclado (H/U/N/P/S/Delete) | `src/App.tsx` |
| 42 | Selección y edición existentes | AnnotationLayer + sidebar |
| 43 | Tests E2E (skeleton) | `tests/e2e/annotations.spec.ts` |
| 44 | Bulk delete + confirm | AnnotationsPanel |
| 45 | Verificación final + tag v0.2.0-alpha-annotations | - |

## Detalles clave

### Sidecar `.airpdf.json`

Archivo junto al PDF (`paciente.pdf.airpdf.json`). Schema completo en spec §4.4.

```rust
struct Annotation {
    id: String, r#type: String, page: u16,
    rect: [f32; 4], color: String,
    category: Option<String>, text: Option<String>,
    note: Option<String>, author: String,
    created_at: String, updated_at: String,
    data: serde_json::Value,
}
```

Comandos Tauri: `annotations_load`, `annotations_save`, `annotation_add`, `annotation_update`, `annotation_delete`, `annotations_embed_into_pdf`.

### Tools

highlight | underline | strikethrough | note | drawing | stamp | rect | circle | arrow | select | addText

### Colores (8) y categorías (6)

Colores: FFEB3B, FF9800, F44336, 4CAF50, 2196F3, 9C27B0, 000000, FFFFFF
Categorías: Importante, Revisar, Dosis, Diagnóstico, Pregunta, Cita

### Sellos predefinidos

APROBADO (verde), REVISADO (azul), BORRADOR (naranja), CONFIDENCIAL (rojo), URGENTE (morado).

### Dependencias adicionales

Backend: `sha2 = "0.10"`, `lopdf = "0.34"`.

## Resultado esperado

Release `v0.2.0-alpha-annotations`. Reemplaza Acrobat para REVISIÓN de papers/expedientes.
