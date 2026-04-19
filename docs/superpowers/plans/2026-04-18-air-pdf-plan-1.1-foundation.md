# AirPDF Plan 1.1 - Fundación

**Goal:** Visor PDF funcional completo (reemplaza Xodo para LECTURA).

**Tech:** Tauri 2 + Rust + React + PDFium + PDF.js + Zustand + Vitest + Cargo test.

## Mapa de Tareas

### Grupo A: Setup (T1-T5) - COMPLETADO

| # | Task | Status | Commit |
|---|---|---|---|
| 1 | Scaffold Tauri + React + TS | ✅ | `e92d969` |
| 2 | Tailwind + shadcn/ui | ✅ | `25405bc` |
| 3 | Testing infrastructure | ✅ | `cd196d8` |
| 4 | Module scaffolding (backend + types) | 🔄 | - |
| 5 | GitHub Actions CI/release | ⏳ | - |

### Grupo B: Backend PDF Engine (T6-T13)

| # | Task | Files |
|---|---|---|
| 6 | Integrar pdfium-render + bundle PDFium.dll | `src-tauri/pdf/engine.rs`, `build.rs`, `Cargo.toml`, `tauri.conf.json` |
| 7 | DocumentInfo + load_document_info | `src-tauri/pdf/document.rs` |
| 8 | render_page_to_png | `src-tauri/pdf/renderer.rs` |
| 9 | Tauri commands pdf_open + pdf_render_page | `src-tauri/commands/pdf.rs`, `main.rs` |
| 10 | extract_page_text + pdf_extract_text | `src-tauri/pdf/extractor.rs` |
| 11 | extract_bookmarks (BookmarkNode) | `src-tauri/pdf/extractor.rs` |
| 12 | search_text + pdf_search | `src-tauri/pdf/extractor.rs`, `commands/search.rs` |
| 13 | get_pages_info + pdf_get_pages_info | `src-tauri/pdf/document.rs` |

### Grupo C: Frontend Viewer (T14-T23)

| # | Task | Files |
|---|---|---|
| 14 | PDF.js + Tauri wrapper + pdfStore | `src/lib/tauri.ts`, `src/lib/pdfjs.ts` |
| 15 | usePdfDocument hook | `src/hooks/usePdfDocument.ts` |
| 16 | PdfViewer + PageRenderer | `src/components/viewer/` |
| 17 | ZoomControls | `src/components/viewer/ZoomControls.tsx` |
| 18 | PageNavigation | `src/components/viewer/PageNavigation.tsx` |
| 19 | Sidebar + ThumbnailsPanel (react-window) | `src/components/sidebar/` |
| 20 | BookmarksPanel | `src/components/sidebar/BookmarksPanel.tsx` |
| 21 | SearchDialog (Ctrl+F) | `src/components/dialogs/SearchDialog.tsx` |
| 22 | Reading mode (F11) + uiStore | `src/stores/uiStore.ts` |
| 23 | ViewModeSelector (single/double/continuous) | `src/components/viewer/ViewModeSelector.tsx` |

### Grupo D: App Shell (T24-T30)

| # | Task | Files |
|---|---|---|
| 24 | Multi-tab UI | `src/components/tabs/` |
| 25 | Recent files (backend + dropdown) | `src-tauri/storage/recent.rs` |
| 26 | Drag & drop | `src/hooks/useDragDrop.ts` |
| 27 | Shortcuts centralizados | `src/hooks/useShortcuts.ts` |
| 28 | Settings persistentes (TOML) | `src-tauri/storage/settings.rs` |
| 29 | MenuBar (File/Edit/View) | `src/components/menu/MenuBar.tsx` |
| 30 | StatusBar + detect AI mode | `src-tauri/integrations/claude_code.rs`, `src/components/statusbar/` |

## Detalles Task 4 - Module scaffolding

**Files a crear:**

Backend (Rust):
- `src-tauri/src/error.rs` - AppError enum con thiserror + serde
- `src-tauri/src/commands/mod.rs` + submodules (pdf, pages, annotations, search, content_edit, settings)
- `src-tauri/src/pdf/mod.rs` + submodules (engine, document, editor, renderer, extractor)
- `src-tauri/src/storage/mod.rs` + submodules (sidecar, settings, recent, autosave, version_history)
- `src-tauri/src/integrations/mod.rs` + submodules (claude_code, claude_api, ollama)
- Actualizar `Cargo.toml` con: serde, serde_json, thiserror, tokio, tauri-plugin-dialog, tauri-plugin-fs
- Actualizar `lib.rs` con módulos pub mod

Frontend (TS):
- `src/types/pdf.ts` - PdfDocument, PdfPage, Bookmark, SearchResult
- `src/types/annotations.ts` - Annotation, AnnotationsSidecar, AnnotationType
- `src/types/settings.ts` - Settings interface
- Crear dirs: `src/components/{viewer,sidebar,toolbar,annotations,editor,tabs,dialogs,menu,statusbar,shared}`
- Crear dirs: `src/hooks`, `src/stores`

## Detalles Task 5 - CI workflows

**Files:**
- `.github/workflows/ci.yml` - Test frontend + Rust + build no-bundle en Windows
- `.github/workflows/release.yml` - MSI + NSIS en tag push, GitHub Release

## Detalles Task 6 - PDFium integration

1. Agregar a Cargo.toml:
```toml
pdfium-render = { version = "0.8", features = ["thread_safe", "image"] }
image = "0.25"
once_cell = "1.19"
```

2. Descargar `pdfium-win-x64.tgz` de bblanchon/pdfium-binaries releases -> extract a `src-tauri/pdfium/bin/pdfium.dll`

3. Agregar al bundle en `tauri.conf.json`:
```json
"resources": ["pdfium/bin/pdfium.dll"]
```

4. Modificar `build.rs` para copiar DLL al target dir en dev

5. Implementar `src-tauri/src/pdf/engine.rs` con OnceCell<Pdfium> singleton

**TDD:** test_pdfium_initializes + test_pdfium_accessible_after_init.

## Referencia detalle

El detalle TDD completo task-por-task (steps, código, tests) está en el contexto de la conversación de brainstorming del 2026-04-18. Se regenerará bajo demanda o se creará via subagent-driven-development al ejecutar cada task.
