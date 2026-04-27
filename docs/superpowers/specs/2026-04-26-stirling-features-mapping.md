# Mapping: features de Stirling-PDF vs air-pdf v0.3.1

**Fecha:** 2026-04-26
**Origen:** Sub-plan 2.0.E del plan de evaluacion OSS.
**Proposito:** Decidir scope de v0.4+ comparando con el catalogo mas completo
de operaciones PDF open source disponible (Stirling-PDF, ~70k stars en GitHub).

## Leyenda

- **YA** = ya implementado en air-pdf v0.3.1
- **BACKLOG** = ya declarado como pendiente en CHANGELOG
- **NUEVO** = no estaba contemplado, evaluar prioridad
- **NO** = fuera de scope clinico, no aplica

## Operaciones de pagina

| Stirling-PDF | air-pdf | Estado | Nota |
|---|---|---|---|
| Rotate pages | rotate izq/der/180/full doc | YA | |
| Split PDF | split por rangos | YA | |
| Merge PDFs | merge con reorder | YA | |
| Reorder pages | drag-drop thumbnails | YA | |
| Delete pages | delete page | YA | |
| Extract pages | extract pages | YA | |
| Duplicate page | duplicate | YA | |
| Insert blank page | insert blank A4 | YA | |
| Crop margins | crop uniforme | YA | |
| Multi-page layout (N-up) | — | NUEVO | Util para imprimir 4-en-1, baja prioridad |
| Scale pages | — | NUEVO | Reescalar A4 a A3 etc. Baja prioridad |
| Single big page (concat vertical) | — | NUEVO | Util para reading mode largo, baja prioridad |
| Pdf to single page | — | NUEVO | Inverso del anterior, baja prioridad |
| Split by sections | — | NUEVO | Dividir por bookmarks. Util si hay TOC. Media prioridad |
| Split by file size | — | NUEVO | Util para email. Media prioridad |
| Pipeline (encadenar operaciones) | — | NUEVO | Power user, baja prioridad |

## Conversion hacia PDF

| Stirling-PDF | air-pdf | Estado | Nota |
|---|---|---|---|
| Image to PDF | pdf_from_images A4 | YA | |
| HTML to PDF | — | NUEVO | Requiere headless browser. Diferir |
| Markdown to PDF | — | NUEVO | Util para informes. Media prioridad si Alfredo escribe en MD |
| URL to PDF | — | NUEVO | Requiere headless browser. Diferir |
| File to PDF (LibreOffice) | — | BACKLOG | Plan 3 ya planeado |
| EML to PDF | — | NO | No aplica al caso clinico |

## Conversion desde PDF

| Stirling-PDF | air-pdf | Estado | Nota |
|---|---|---|---|
| PDF to image (PNG/JPG) | export pages PNG/JPG con DPI | YA | |
| PDF to text | extract text .txt/.md | YA | |
| PDF to Word | — | BACKLOG | Plan 3 ya planeado |
| PDF to PowerPoint | — | BACKLOG | Plan 3 |
| PDF to Excel | — | BACKLOG | Plan 3 |
| PDF to HTML | — | NUEVO | Baja prioridad |
| PDF to XML | — | NO | No aplica |
| PDF to CSV (tablas) | — | NUEVO | Util para extraer tablas de informes. Media prioridad |
| PDF to PDF/A | — | NUEVO | Util para archivado clinico/legal. **Media-alta prioridad** |

## Seguridad

| Stirling-PDF | air-pdf | Estado | Nota |
|---|---|---|---|
| Add password | — | BACKLOG | Sub-plan 2.0.A en curso (qpdf-rs) |
| Remove password | — | BACKLOG | Cubierto por 2.0.A (decrypt) |
| Change permissions | — | NUEVO | Cubierto naturalmente por qpdf-rs. Sumar a 2.0.A |
| Sign PDF | — | BACKLOG | Sub-plan 2.0.B (al final) |
| Validate signature | — | NUEVO | Util si recibimos PDFs firmados. Sumar a 2.0.B |
| Sanitize PDF (remove JS, forms, embedded) | — | NUEVO | **Alta prioridad** para uso clinico (recibir PDFs externos sin trackers). Considerar para v0.4 |
| Redact text | redaction con rects negros | YA | Solo visual. Sanitize seria complemento |

## Anotaciones

| Stirling-PDF | air-pdf | Estado |
|---|---|---|
| Highlight | YA | |
| Note / Comment | YA (sticky note) | |
| Drawing / Ink | YA (pen) | |
| Stamp | YA (5 sellos + presets) | |
| Free text on PDF | YA (FreeTextEditor) | |

## Estampado

| Stirling-PDF | air-pdf | Estado |
|---|---|---|
| Watermark | YA (diagonal, opacidad) | |
| Page numbers | YA (formato configurable) | |
| Image stamp | YA (firma escaneada) | |
| Text stamp con presets | YA (APROBADO, etc.) | |

## Metadata y atributos

| Stirling-PDF | air-pdf | Estado | Nota |
|---|---|---|---|
| Edit metadata | YA | |
| Get PDF info | parcial (paginas, size) | NUEVO | Mostrar info completa (PDF version, encryption, fonts, etc.). Baja prioridad |
| Show JavaScript | — | NUEVO | Util para auditoria de PDFs externos. Combinar con sanitize |
| Auto-rename PDF (basado en titulo) | — | NUEVO | Workflow util para descargas. Baja-media |
| Change page size | — | NUEVO | Util ocasional. Baja prioridad |
| Flatten | flatten al guardar con anotaciones | YA (parcial) | |
| Edit attachments | — | NUEVO | PDFs clinicos a veces traen attachments. Media prioridad |

## OCR y forms

| Stirling-PDF | air-pdf | Estado | Nota |
|---|---|---|---|
| OCR (Tesseract) | YA (spa+eng) | |
| View forms (AcroForm) | YA (read-only) | |
| Fill forms | — | BACKLOG | Plan 3 |
| Edit forms | — | BACKLOG | Plan 3 |

## Imagenes y multimedia

| Stirling-PDF | air-pdf | Estado | Nota |
|---|---|---|---|
| Extract images | — | NUEVO | Util para reusar graficos de papers. Media prioridad |
| Compress images | — | NUEVO | Cubierto parcialmente por compress |
| Add image | image stamp | YA | |
| View attachments | — | NUEVO | Junto a "Edit attachments" arriba |

## Comparacion y deteccion

| Stirling-PDF | air-pdf | Estado | Nota |
|---|---|---|---|
| Compare 2 PDFs | YA (linea por linea) | |
| Blank page detection | — | NUEVO | Util para escaneos. Auto-eliminar paginas en blanco. **Alta prioridad para OCR clinico** |
| Auto-redact (regex de DNI, telefonos, etc.) | — | NUEVO | **Alta prioridad** para anonimizar historias clinicas |

## Pipeline / batch

| Stirling-PDF | air-pdf | Estado |
|---|---|---|
| Pipeline editor | — | NO | Power user, fuera de scope |
| Batch operations | parcial (merge multiple) | NUEVO | Procesar carpeta entera con misma operacion. Media prioridad |

## Optimizacion

| Stirling-PDF | air-pdf | Estado |
|---|---|---|
| Compress | YA (con reporte antes/despues) | |
| Repair | — | NUEVO | Util si recibimos PDFs corruptos. Lo cubre lopdf parcialmente |
| Linearize (web optimization) | — | NUEVO | Cubierto naturalmente por qpdf-rs. Sumar a 2.0.A |

## Veredicto: candidatos para v0.4 (mas alla de los planes 2.0.A-E)

Ranking por valor clinico para Alfredo:

1. **Sanitize PDF** (remove JS, embedded files, dangerous metadata) — alta seguridad al recibir PDFs externos.
2. **Auto-redact regex** (DNI peruano, telefonos, emails, nombres en HC) — anonimizacion para investigacion / docencia.
3. **Blank page detection** + auto-elimina — escaneos clinicos limpios.
4. **PDF to PDF/A** — archivado de historias clinicas (cumple normativa de retencion).
5. **Change permissions** y **linearize** — quick wins gratis al implementar 2.0.A (qpdf-rs los cubre).
6. **Validate signature** — quick win al implementar 2.0.B.
7. **Extract images** — util para reusar graficos en presentaciones / papers.
8. **Edit attachments** — soporte completo de PDFs con archivos embebidos.
9. **Markdown to PDF** — solo si Alfredo escribe en MD (vault Obsidian).
10. **Split por bookmarks / por tamano** — productividad.

**Sugerencia para v0.4 final:** los 5 sub-planes 2.0.A-E **mas** los items
1-4 de este ranking (sanitize, auto-redact, blank detection, PDF/A).
Items 5 y 6 caen como bonus de A y B sin trabajo extra. Items 7-10 a v0.5+.

## Lo que NO se debe copiar de Stirling-PDF

- Codigo de los subdirectorios `app/proprietary/`, `engine/`,
  `frontend/src/proprietary/`, `frontend/src/desktop/`, `frontend/src/saas/`,
  `frontend/src/prototypes/`. Esos tienen LICENSE propietario distinto al MIT
  del core.
- La integracion con LibreOffice por CLI (Stirling depende de LibreOffice
  instalado). Para air-pdf eso queda para Plan 3 con decision propia.
- El frontend Java/Thymeleaf/SPA mixto. Nuestra UI es React puro.

## Lo que SI se puede aprender (sin copiar)

- Nombres y agrupacion de las herramientas en el menu (UX consistente con
  expectativas de usuarios que vienen de Acrobat).
- Estructura de "tool form -> validation -> service -> response" replicable
  como `commands/<tool>.rs` -> `pdf::<modulo>::<funcion>`.
- Multi-idioma: Stirling tiene 38+ idiomas. air-pdf tiene es-ES + en-US.
  Ampliar es facil si los strings estan centralizados.

## Referencias

- Stirling-PDF README: https://github.com/Stirling-Tools/Stirling-PDF
- Stirling-PDF DeveloperGuide: https://github.com/Stirling-Tools/Stirling-PDF/blob/main/DeveloperGuide.md
- Plan 2.0 origen: `docs/superpowers/plans/2026-04-26-air-pdf-plan-2.0-evaluacion-componentes-oss.md`
