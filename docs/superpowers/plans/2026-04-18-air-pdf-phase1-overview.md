# AirPDF Fase 1 - Overview

Fase 1 dividida en 3 sub-planes ejecutables independientemente.

**Spec:** [`../specs/2026-04-18-air-pdf-design.md`](../specs/2026-04-18-air-pdf-design.md)

## Sub-planes

| Sub-plan | Archivo | Tareas | Duración | Resultado |
|---|---|---|---|---|
| 1.1 Fundación | `2026-04-18-air-pdf-plan-1.1-foundation.md` | ~30 | 1 sem | Visor PDF funcional |
| 1.2 Anotaciones | `2026-04-18-air-pdf-plan-1.2-annotations.md` | ~15 | 1 sem | Anotaciones completas |
| 1.3 Edición + Release | `2026-04-18-air-pdf-plan-1.3-editing-release.md` | ~17 | 1 sem | MSI v0.1.0 |

## Stack

Tauri 2 + React 19 + TypeScript + Vite + Tailwind 3 + shadcn/ui + Zustand 5 + PDF.js 4 + pdfium-render 0.9 + Vitest 4 + Cargo test + Playwright 1.59 + GitHub Actions.

## Estado actual (snapshot 2026-04-19 ~10:20)

### Plan 1.1 - progreso: 21 de 30 tareas (70%)

| # | Task | Status | Commit |
|---|---|---|---|
| 1 | Scaffold Tauri + React + TS | Done | `e92d969` |
| 2 | Tailwind + shadcn/ui | Done | `25405bc` |
| 3 | Testing infrastructure | Done | `cd196d8` |
| 4 | Module scaffolding (Rust + TS types) | Done | `b41c565` |
| 5 | GitHub Actions CI + Release | Done | `03c2d14` |
| 6 | PDFium integration (DLL bundle) | Done | `d6c37e5` |
| 7-13 | PDF engine core (document, render, extract, search, pages) | Done | `ac5e4a1` |
| 14 | PDF.js setup + typed Tauri wrapper | Done | `1dd834d` |
| 15 | Zustand stores (pdfStore + uiStore) | Done | `1dd834d` |
| 16 | PdfViewer + PageRenderer | Done | `5fcab7c` |
| 17 | ZoomControls | Done | `5fcab7c` |
| 18 | PageNavigation | Done | `5fcab7c` |
| 19 | Sidebar + ThumbnailsPanel | Done | `bca5136` |
| 20 | BookmarksPanel | Done | `bca5136` |
| 21 | SearchDialog (Ctrl+F) | Done | `bca5136` |
| 22 | Reading mode (F11) | Done | `5fcab7c` |
| 23 | ViewModeSelector (single/double/continuous) | Done | `5fcab7c` |
| 24 | Multi-tab UI | Pending | - |
| 25 | Recent files | Pending | - |
| 26 | Drag & drop | Done | `5fcab7c` |
| 27 | Centralized shortcuts | Done | `5fcab7c` |
| 28 | Settings persistentes (TOML) | Pending | - |
| 29 | MenuBar (File/Edit/View) | Pending | - |
| 30 | StatusBar + detect AI mode | Pending | - |

### Tests
- Frontend (Vitest): **7/7 passing**
- Rust (Cargo): **17/17 passing**
- E2E (Playwright): 0/1 skipped hasta instalar Chromium

### Capacidades actuales del visor (al correr `pnpm tauri dev`)

- Abrir PDF via dialog (Ctrl+O) o drag-drop
- Render de páginas con PDFium → PNG
- Navegación: prev/next/first/last/input directo, PgUp/Dn, arrows, Ctrl+Home/End
- Zoom: botones +/-/fit, Ctrl+wheel (0.25x-5x), reset al click
- Vistas: 1 página / 2 páginas / continuo
- Thumbnails sidebar (scroll + click jump, página activa con ring)
- Bookmarks sidebar (tree nested, expand/collapse, click navega)
- Búsqueda Ctrl+F (case-sensitive opcional, resultados con contexto 40 chars)
- Modo lectura F11 (oculta header + sidebar), Esc sale
- Toggle sidebar con botón en header
- Backend PDF: load metadata, render page, extract text, bookmarks, search, page info, save backup
- PDFium DLL bundled (7MB), detección automática al startup

### Lo que falta para cerrar Plan 1.1

- Task 24: multi-tab (tab bar arriba, actualmente solo muestra último tab abierto)
- Task 25: recent files dropdown en header
- Task 28: settings.toml persistencia en `%APPDATA%/AirPDF/settings.toml`
- Task 29: MenuBar (File/Edit/View) como fallback a botones
- Task 30: StatusBar con detección Claude Code / API key / Ollama

Ninguna bloquea el uso básico. Se puede abrir, leer, navegar. Anotaciones vienen en Plan 1.2.

## Commits realizados (cronológico)

```
e92d969 chore: scaffold Tauri 2 + React + TS template
25405bc feat: setup Tailwind CSS + shadcn/ui
cd196d8 test: setup Vitest + Cargo test + Playwright infrastructure
f38b564 docs: restore design spec + phase 1 plans
b41c565 feat: scaffold backend modules + frontend types
03c2d14 ci: GitHub Actions workflows (CI + Release)
d6c37e5 feat(pdf): integrate pdfium-render 0.9 with bundled PDFium DLL
ac5e4a1 feat(pdf): implement PDF engine core (Tasks 7-13)
1dd834d feat(frontend): Tauri wrapper + Zustand stores (Tasks 14-15)
5fcab7c feat(viewer): implement full PDF viewer UI (Tasks 16-23 core)
bca5136 feat(viewer): Sidebar + Thumbnails + Bookmarks + Search (Tasks 19-21)
```

## Próximos pasos

1. Probar `pnpm tauri dev` manualmente con PDFs reales (3 días uso sugerido)
2. Terminar Plan 1.1 (Tasks 24, 25, 28, 29, 30) en próxima sesión
3. Ejecutar Plan 1.2 (anotaciones)
4. Ejecutar Plan 1.3 (edición + MSI v0.1.0 release)

## Cómo correr todo

```powershell
cd "D:\Dropbox\Claude Code\air-pdf"

# PATH para esta terminal (si Rust no esta en PATH)
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"

# Desarrollo (hot reload Vite + Tauri)
pnpm tauri dev

# Tests
pnpm test           # frontend
pnpm test:rust      # backend

# Build release (genera MSI en target/release/bundle/msi/)
pnpm tauri build
```
