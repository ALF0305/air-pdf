# AirPDF Plan 1.3 - Edición + Release

**Goal:** Edición de páginas + contenido ligero + packaging MSI v0.1.0.

**Dependencia:** Plan 1.2 completado.

## Mapa de Tareas (T46-T62)

### Grupo F: Edición de páginas (T46-T52)

| # | Task | Files |
|---|---|---|
| 46 | rotate_pages backend | `src-tauri/pdf/editor.rs`, `commands/pages.rs` |
| 47 | extract_pages + delete_pages | editor.rs |
| 48 | merge_pdfs + split_pdf_at_pages | editor.rs |
| 49 | Frontend drag-drop reorder (dnd-kit) | ThumbnailsPanel |
| 50 | MergePdfsDialog | `src/components/dialogs/MergePdfsDialog.tsx` |
| 51 | SplitExtractDialog | `src/components/dialogs/SplitExtractDialog.tsx` |
| 52 | Rotate toolbar + pdf_save_backup | `src/components/toolbar/MainToolbar.tsx` |

### Grupo G: Edición de contenido (T53-T55)

| # | Task | Files |
|---|---|---|
| 53 | add_text_to_page (lopdf) | editor.rs, `commands/content_edit.rs` |
| 54 | Frontend "addText" tool | AnnotationToolbar, AnnotationLayer |
| 55 | ADR 0001 text editing limitations | `docs/decisions/0001-text-editing-limitations.md` |

### Grupo H: Save + Release (T56-T62)

| # | Task | Files |
|---|---|---|
| 56 | AutoSaveManager (tokio task 5min) | `src-tauri/storage/autosave.rs` |
| 57 | Version history (last 10) | `src-tauri/storage/version_history.rs` |
| 58 | Tauri MSI builder config producción | `tauri.conf.json`, `Cargo.toml` |
| 59 | Auto-update Tauri updater | `tauri-plugin-updater`, keys |
| 60 | GitHub Actions release con signing | `.github/workflows/release.yml` |
| 61 | README + user guide v0.1.0 | `README.md`, `docs/user-guide/` |
| 62 | Release v0.1.0 final | tag + push |

## Deps adicionales Plan 1.3

- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (frontend)
- `tauri-plugin-updater = "2"` (backend)

## Edición de contenido - alcance limitado

Fase 1 = "edición ligera":
- Tachar (strikethrough annotation)
- Agregar texto en posición vacía (add_text_to_page)
- No reemplazo inline con reflow (eso es Fase 4)

## Release v0.1.0 - Checklist final

1. Tests frontend + Rust + e2e pasan
2. MSI compila en `src-tauri/target/release/bundle/msi/`
3. Instalar MSI en PC nueva sin Claude Code
4. Probar con PDFs reales (paper, expediente, formulario, brochure)
5. Anotaciones persisten al cerrar/reabrir
6. Edición páginas no corrompe
7. Auto-save crea `%APPDATA%/AirPDF/autosave/`
8. Version history hasta 10 snapshots
9. Auto-update endpoint OK
10. Tag `v0.1.0` + push + GitHub Release

## Resultado

`AirPDF-0.1.0-setup.msi` + `AirPDF-0.1.0-setup.exe` (NSIS). Standalone Windows, ~20MB, reemplaza Acrobat Pro + Xodo para Fase 1. Listo para Fase 2 (Formularios + Firmas).
