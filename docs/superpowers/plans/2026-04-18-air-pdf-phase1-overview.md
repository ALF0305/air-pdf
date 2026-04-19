# AirPDF Fase 1 - Overview

Fase 1 dividida en 3 sub-planes ejecutables independientemente.

**Spec:** [`../specs/2026-04-18-air-pdf-design.md`](../specs/2026-04-18-air-pdf-design.md)

## Sub-planes

| Sub-plan | Archivo | Tareas | Duración | Resultado |
|---|---|---|---|---|
| 1.1 Fundación | `2026-04-18-air-pdf-plan-1.1-foundation.md` | ~24 | 1 sem | Visor PDF funcional |
| 1.2 Anotaciones | `2026-04-18-air-pdf-plan-1.2-annotations.md` | ~15 | 1 sem | Anotaciones completas |
| 1.3 Edición + Release | `2026-04-18-air-pdf-plan-1.3-editing-release.md` | ~17 | 1 sem | MSI v0.1.0 |

## Stack

Tauri 2 + React 18 + TypeScript + Vite + Tailwind + shadcn/ui + Zustand + PDF.js + PDFium (pdfium-render) + pdf-lib + Vitest + Cargo test + Playwright + GitHub Actions.

## Criterios de éxito v0.1.0

1. MSI compila e instala limpio en PC Windows nueva
2. Visor abre PDFs hasta 1000 páginas sin lag
3. Anotaciones se persisten (sidecar + embedded)
4. Edición de páginas + contenido ligero sin corromper
5. Auto-save + .bak + version history (10)
6. Tests automatizados cobertura >70% código nuevo
7. Probado con: paper médico, expediente, formulario MINSA, brochure AirPro
8. Documentación actualizada
9. Auto-update configurado
10. Cero crashes en sesiones 2+ horas

## Orden de ejecución

1. Plan 1.1 completo + tests + commit
2. Probar visor con PDFs reales (3 días uso)
3. Plan 1.2
4. Probar anotaciones
5. Plan 1.3
6. MSI + instalar en PCs oficina
7. Release v0.1.0

## Estado actual (al cerrar sesión 2026-04-19)

- [x] Task 1 - Scaffold Tauri + React + TS (commit `e92d969`)
- [x] Task 2 - Tailwind + shadcn/ui (commit `25405bc`)
- [x] Task 3 - Testing infrastructure (commit `cd196d8`)
- [ ] Task 4 - Module scaffolding (en progreso)
- [ ] Task 5-24 - Resto de Plan 1.1
