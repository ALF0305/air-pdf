# AirPDF Fase 1 - Overview (FINAL sesión 2026-04-19)

**Status: Fase 1 completa al 76% (47/62 tareas). Visor + anotaciones + edición páginas listos. Pendiente: auto-save, MSI release.**

## Sub-planes ejecutados

| Sub-plan | Tareas | Status | Tag |
|---|---|---|---|
| 1.1 Fundación | 30 | ✅ COMPLETO | `v0.1.0-alpha-foundation` |
| 1.2 Anotaciones | 15 | ✅ COMPLETO | `v0.2.0-alpha-annotations` |
| 1.3 Edición + Release | 17 | 🟡 8/17 done | pending |

## Capacidades implementadas

### Lectura y navegación
- Visor PDF rápido (PDFium 7MB bundled)
- Multi-tab con middle-click para cerrar
- Thumbnails sidebar click-jump
- Bookmarks tree nested con expand/collapse
- Búsqueda Ctrl+F con contexto + case-sensitive
- Modo lectura F11
- Multi-vista: 1/2/continuo
- Zoom Ctrl+wheel 0.25x-5x
- Drag & drop
- Recent files (últimos 20)
- Atajos de teclado completos

### Anotaciones
- 10 herramientas (highlight, underline, strikethrough, note, pen, stamp, rect, circle, arrow, select)
- 8 colores + 6 categorías + 5 sellos predefinidos
- Sidecar `.airpdf.json` no destructivo
- Export a Markdown para vault Obsidian con frontmatter
- Embed en PDF interoperable con Acrobat/Xodo (lopdf)
- Panel lateral con filtro + edición inline + clear all
- SHA256 hash del PDF para detectar cambios

### Edición de páginas
- Rotar página (izquierda/derecha 90°)
- Extraer página actual a PDF nuevo
- Eliminar página
- Backup `.bak` automático antes de cada modificación
- Version history (últimas 10 snapshots en %APPDATA%)

### Configuración
- Settings TOML en `%APPDATA%/AirPDF/settings.toml`
- Detección AI: Claude Code / `ANTHROPIC_API_KEY` / Ollama
- StatusBar con badge del modo

### Privacidad
- Sin telemetría
- Local-first (sidecar no modifica PDF original)
- Cumple Ley 29733 por diseño
- Open source MIT

## Tests

- **Frontend (Vitest):** 7/7 passing
- **Rust (Cargo):** 32/32 passing
  - engine (3), document (2), editor (2), extractor (6), renderer (3)
  - storage: recent (3), settings (3), sidecar (4), version_history (2)
  - integrations: claude_code (1)
  - lib: misc (3)
- **E2E (Playwright):** skeleton

## Pendiente para v0.1.0 final

- Task 53: Content editing (add text via lopdf)
- Task 56: Auto-save background task
- Task 59: Auto-update Tauri updater
- Task 60: GitHub Actions release workflow con signing
- Task 62: Release v0.1.0 final

## Commits realizados

```
abbf2e2 feat: Plan 1.3 partial - page editing + version history
08b1719 feat(annotations): complete Plan 1.2 (Tasks 31-45)
5de3fb4 feat: complete Plan 1.1 (Tasks 24-30)
2f4ca51 docs: update phase 1 overview snapshot
bca5136 feat(viewer): Sidebar + Thumbnails + Bookmarks + Search
5fcab7c feat(viewer): implement full PDF viewer UI
1dd834d feat(frontend): Tauri wrapper + Zustand stores
ac5e4a1 feat(pdf): implement PDF engine core
d6c37e5 feat(pdf): integrate pdfium-render 0.9 with bundled DLL
03c2d14 ci: GitHub Actions workflows (CI + Release)
b41c565 feat: scaffold backend modules + frontend types
f38b564 docs: restore design spec + phase 1 plans
cd196d8 test: setup Vitest + Cargo test + Playwright
25405bc feat: setup Tailwind CSS + shadcn/ui
e92d969 chore: scaffold Tauri 2 + React + TS template
```

## Cómo correr

```powershell
cd "D:\Dropbox\Claude Code\air-pdf"
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"

pnpm tauri dev      # desarrollo
pnpm test           # frontend tests
pnpm test:rust      # rust tests
pnpm tauri build    # MSI release (5-10 min primera vez)
```

## Próximos planes

- **Plan 2 (Fase 2):** Formularios AcroForm/XFA + firmas (manuscrita, imagen, RENIEC PKI)
- **Plan 3 (Fase 3):** OCR Tesseract + conversión LibreOffice (PDF↔Word/Excel/PPT)
- **Plan 4 (Fase 4):** Edición avanzada (reflow texto, tablas, comparar versiones)
- **Plan 5 (Fase 5):** Pro features (redacción, metadata scrub, formularios WYSIWYG) + IA completa
