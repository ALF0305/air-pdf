# CLAUDE.md - AirPDF

## Contexto
Proyecto: reemplazo de Adobe Acrobat Pro y Xodo para Alfredo Pachas (Lima, Peru).
Stack: Tauri 2 (Rust + WebView) + React 18 + TS + PDF.js + PDFium.
Distribucion: MSI Windows, instalable en multiples PCs.

## Estructura clave
- `src-tauri/` - backend Rust (Tauri commands, PDF engine via PDFium)
- `src/` - frontend React + TS
- `docs/superpowers/specs/` - spec de diseno aprobado
- `docs/superpowers/plans/` - planes de implementacion por fase
- `tests/fixtures/` - PDFs de prueba

## Convenciones
- Idioma: espanol (UI, comentarios, commits)
- Sin emojis en codigo ni docs
- TDD: test primero, implementacion despues
- Commits frecuentes (uno por step completo)
- Sin telemetria, sin cloud forzado, local-first

## Comandos
- Dev: `pnpm tauri dev`
- Build: `pnpm tauri build`
- Test frontend: `pnpm test`
- Test backend: `cd src-tauri && cargo test`
- E2E: `pnpm test:e2e`

## Setup de PATH en Windows
Si Rust no se ve en el PATH de la terminal:
```bash
export PATH="$USERPROFILE/.cargo/bin:$PATH"
```

## Fase actual
Fase 1 - ver `docs/superpowers/plans/2026-04-18-air-pdf-phase1-overview.md`
