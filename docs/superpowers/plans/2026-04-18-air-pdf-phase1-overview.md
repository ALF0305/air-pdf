# AirPDF Fase 1 - Overview (FINAL sesion 2026-04-20)

**Status: Fase 1 SHIPPED en v0.3.1 (paridad amplia con Acrobat Pro para
flujo clinico). Pendiente para Fase 2: formularios editables + firmas
digitales.**

## Sub-planes ejecutados

| Sub-plan | Tareas | Status | Tag/commit |
|---|---|---|---|
| 1.1 Fundacion | 30 | Completo | `v0.1.0-alpha-foundation` |
| 1.2 Anotaciones | 15 | Completo | `v0.2.0-alpha-annotations` |
| 1.3 Edicion + Release | 17 | Completo | `v0.1.0-beta` |
| 2.0 Transform + UX + IA | extra | Completo (cambio de alcance) | pending tag `v0.3.1` |

El alcance se amplio durante ejecucion: lo que el plan 1.3 describia
como "edicion ligera + release" crecio a tres releases (0.1.0, 0.2.0,
0.3.0) con OCR, modo oscuro, IA opcional, comparar PDFs, historial de
versiones, editor de TOC, redaction, sello de texto con presets, etc.
Todo el trabajo extra esta documentado en el `CHANGELOG.md`.

## Capacidades implementadas (estado v0.3.1)

### Lectura y navegacion
- Visor PDF con PDFium (7MB bundled) y 2x oversampling crisp
- Multi-tab, middle-click cerrar
- Thumbnails sidebar con drag-and-drop reorder (dnd-kit)
- Bookmarks tree + editor de TOC (anadir/renombrar/reordenar/eliminar)
- Busqueda Ctrl+F con contexto + case-sensitive
- Modo lectura F11, modo presentacion Ctrl+L
- Multi-vista: 1/2/continuo, lazy load con IntersectionObserver
- Zoom 0.25x-5x (Ctrl+wheel, Ctrl++/--/=/0)
- Drag & drop, recent files, ir a pagina (Ctrl+G)
- Modo oscuro Ctrl+Shift+D persistente

### Anotaciones
- 10 herramientas: highlight, underline, strikethrough, note, pen,
  stamp, rect, circle, arrow, select
- Categorias (incluye REDACT y FORM_FIELD), 8 colores, 5 sellos
- Texto libre sobre PDF con `FreeTextEditor` y `ResizableBox`
- Sidecar `.airpdf.json` no destructivo con SHA256
- Export anotaciones a Markdown con frontmatter (vault Obsidian)
- Embed en PDF interoperable con Acrobat/Xodo (lopdf)
- Panel lateral con filtro, edicion inline, clear all

### Edicion de paginas
- Rotar (izq/der 90, doc completo 90/-90/180)
- Extraer, eliminar, duplicar, insertar pagina en blanco
- Merge multiples PDFs con reorder
- Split por rangos (ej. `1-5, 8, 10-12`)
- Reorder por drag-and-drop en thumbnails
- Recortar margenes uniformes (CropBox)

### Transformacion y exportacion
- Exportar paginas como PNG/JPG (DPI 72/150/300)
- Crear PDF desde imagenes (A4 centrado)
- Extraer texto a .txt / .md (separado por pagina)
- Comprimir PDF (con reporte antes/despues)

### Estampado y redaction
- Marca de agua diagonal con texto/opacidad
- Numeros de pagina con formato (`{n} / {total}`)
- Sello imagen/firma en posicion configurable
- Sello texto con presets (APROBADO, BORRADOR, CONFIDENCIAL, etc.)
  + fecha automatica en 7 posiciones
- Redaction: rectangulos negros opacos sobre contenido sensible

### Metadata, versiones, backups
- Editor de metadata (titulo, autor, asunto, keywords)
- Version history (ultimas 10 snapshots en %APPDATA%)
- Auto-save snapshot cada 5 min si hubo cambios (`useAutoSave`)
- Backup `.bak` automatico antes de cada edit destructivo
- Guardar con anotaciones embebidas (copia nueva)
- Guardar como copia

### OCR y formularios
- OCR con Tesseract (spa+eng por defecto, multi-idioma)
- Campos de formulario AcroForm (read-only) listados y explorables

### IA opcional (local-first)
- Detecta modo Claude Code / `ANTHROPIC_API_KEY` env / Ollama
- AiDialog con presets: Resumen breve, Resumen paciente, Conclusiones,
  Metodologia
- StatusBar muestra badge del modo activo
- La API key NUNCA se guarda; se lee del env a demanda

### Infraestructura y release
- Tauri 2 + React 19 + TS + Vite 7 + Tailwind 3 + shadcn/ui + Zustand 5
- PDFium via pdfium-render 0.9 thread_safe + lopdf 0.34
- reqwest 0.12 rustls (sin OpenSSL) para Claude API
- Auto-update Tauri firmado con minisign (latest.json en GitHub Releases)
- File association `.pdf` (rol Editor)
- Bundle MSI + NSIS .exe, es-ES + en-US
- Protocol-asset feature para servir recursos locales al WebView
- CI GitHub Actions: pnpm 10, node 20, rust cache Swatinem, firma en
  build, generacion automatica de `latest.json` para updater

### Privacidad / compliance
- Sin telemetria
- Local-first (sidecar no modifica PDF original)
- Cumple Ley 29733 por diseno
- Open source MIT

## Tests

- **Frontend (Vitest):** 7/7 passing
- **Rust (Cargo):** 40/40 passing (antes 33)
  - engine (3), document (2), editor (2), extractor (6), renderer (3)
  - **transform (6)**: compress, rotate x3, metadata, bookmarks
  - storage: recent (3), settings (3), sidecar (4), version_history (2)
  - integrations: claude_code (1), **ai (2)**
  - lib: misc (3)
- **E2E (Playwright):** skeleton
- `.cargo/config.toml` fija `RUST_TEST_THREADS=1` (pdfium.dll no es
  reentrante en carga paralela; antes crasheaba 0x80000003)

## Pendiente explicito para v0.4+

Diferido en CHANGELOG v0.3.0:
- Password protection PDF (requiere qpdf externo o crate custom)
- Firma digital PKCS#7/PAdES (ver `decisions/firma-digital-reniec-tramite.md`)
- Edicion de texto existente con reflow (ver
  `decisions/0001-text-editing-limitations.md`)
- Live preview de watermark y numeros de pagina
- Code signing EV cert + probar auto-updater end-to-end
- Tag `v0.3.1` + release publico (bloqueante: requiere presencia del
  usuario para el push y trigger del workflow)

## Commits realizados en esta sesion

```
b64d0bc test(backend): +7 tests y fix de concurrency PDFium
045992e chore(release): bump to 0.3.1, add CHANGELOG, refreshed release workflow
e912e97 feat(frontend): full UX layer for v0.2-v0.3 releases
477d093 feat(backend): AI integration + updater/process plugins + print command
425457c feat(backend): transform module with 20+ PDF operations (v0.2-v0.3)
2a7aa03 chore(branding): add AirPDF logo, updater pubkey, refreshed app icons
20128b4 chore: ignore Tauri updater keys and local setup notes
```

## Como correr

```powershell
cd "D:\Dropbox\Claude Code\air-pdf"
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"

pnpm tauri dev       # desarrollo
pnpm test            # frontend (Vitest)
pnpm test:rust       # backend (Cargo) — ahora serial por pdfium
pnpm tauri build     # MSI + NSIS release (5-10 min la primera vez)
```

## Proximos planes

- **Plan 2 (Fase 2):** Formularios AcroForm/XFA EDITABLES + firmas
  (manuscrita, imagen, RENIEC PKI). El checklist de tramite RENIEC
  esta en `docs/decisions/firma-digital-reniec-tramite.md`.
- **Plan 3 (Fase 3):** Conversion LibreOffice (PDF <-> Word/Excel/PPT).
  OCR ya esta en 0.3.0.
- **Plan 4 (Fase 4):** Edicion avanzada (reflow de texto, edicion de
  tablas, comparar versiones estructural). Ver ADR 0001.
- **Plan 5 (Fase 5):** Pro features (redaccion avanzada, metadata scrub
  completo, formularios WYSIWYG) + IA completa.
