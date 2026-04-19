# AirPDF

Editor de PDFs standalone para Windows. Reemplaza Adobe Acrobat Pro y Xodo. IA opcional con Claude Code.

## Estado: v0.1.0-beta (Fase 1 completa)

## Características

### Lectura y navegación
- Visor PDF rápido (PDFium engine bundled, 7MB DLL)
- Multi-tab con middle-click para cerrar
- Thumbnails sidebar con click-jump y highlight de página activa
- Bookmarks tree navegables (expand/collapse)
- Búsqueda Ctrl+F con contexto y case-sensitive opcional
- Modo lectura F11 (oculta UI)
- Multi-vista: una página, dos páginas (libro), continuo
- Zoom: botones, Ctrl+wheel (0.25x-5x), fit-width, reset
- Navegación: PgUp/Dn, arrows, Ctrl+Home/End, input directo de página
- Drag & drop de archivos PDF
- Recent files (últimos 20, persistentes)

### Anotaciones
- 10 herramientas: highlight, underline, strikethrough, note, pen (dibujo libre SVG), stamp, rect, circle, arrow
- 8 colores predefinidos + 6 categorías (Importante, Revisar, Dosis, Diagnóstico, Pregunta, Cita)
- 5 sellos predefinidos (APROBADO, REVISADO, BORRADOR, CONFIDENCIAL, URGENTE)
- Sidecar `.airpdf.json` junto al PDF (no destructivo, sync Dropbox friendly)
- Panel lateral con filtro por categoría
- Edición inline de nota + categoría
- Export a Markdown para vault Obsidian (con frontmatter YAML)
- Embed en PDF (interoperable con Acrobat/Xodo)
- SHA256 hash del PDF para detectar cambios

### Edición de páginas
- Rotar página actual (izquierda/derecha 90°)
- Extraer página a PDF nuevo
- Eliminar página
- Backup automático `.bak` antes de cada modificación
- Version history (últimas 10 versiones en `%APPDATA%/AirPDF/versions/`)

### Configuración
- Settings persistentes en `%APPDATA%/AirPDF/settings.toml`
- Detección automática de IA:
  - Claude Code CLI → Modo Pro
  - `ANTHROPIC_API_KEY` env → IA Cloud
  - Ollama localhost:11434 → IA Local
  - Sin ninguno → modo standalone

### Privacidad
- Sin telemetría
- Sin cloud forzado
- Local-first
- Open source (MIT)
- Anotaciones sidecar no modifican PDF original

## Instalación

Una vez el MSI esté disponible (v0.1.0):

1. Descargar `AirPDF-0.1.0-setup.msi` de [Releases](https://github.com/alfredopachas/air-pdf/releases)
2. Ejecutar el instalador
3. Optional: asociar `.pdf` como app default

### Build local

```powershell
cd "D:\Dropbox\Claude Code\air-pdf"
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
pnpm install
pnpm tauri dev      # desarrollo con hot reload
pnpm tauri build    # MSI release en src-tauri/target/release/bundle/msi/
```

## Atajos de teclado

| Acción | Atajo |
|---|---|
| Abrir PDF | Ctrl+O |
| Cerrar tab | Ctrl+W |
| Buscar | Ctrl+F |
| Modo lectura | F11 |
| Salir modo lectura | Esc |
| Página siguiente | PgDn, Arrow Right |
| Página anterior | PgUp, Arrow Left |
| Primera página | Ctrl+Home |
| Última página | Ctrl+End |
| Herramienta Highlight | H |
| Herramienta Underline | U |
| Herramienta Note | N |
| Herramienta Pen | P |
| Herramienta Select | S |
| Eliminar anotación seleccionada | Delete |

## Stack

- **Desktop shell:** Tauri 2.x (Rust + WebView)
- **Frontend:** React 19 + TypeScript + Vite 7
- **UI:** Tailwind CSS 3 + shadcn/ui (Radix primitives) + lucide-react
- **State:** Zustand 5
- **PDF engine:** PDFium via pdfium-render 0.9 (bundled Windows DLL)
- **PDF manipulation:** lopdf 0.34 (annotations, rotate, extract, delete)
- **Testing:** Vitest 4 + Cargo test + Playwright 1.59

## Pruebas

```powershell
pnpm test           # frontend (Vitest): 7/7 passing
pnpm test:rust      # backend (Cargo): 32/32 passing
pnpm test:e2e       # e2e (Playwright, requiere chromium)
```

## Roadmap

| Versión | Foco | Status |
|---|---|---|
| v0.1.0 | Lectura + anotaciones + edición páginas | Beta actual |
| v0.2.0 | Formularios + firmas (AcroForm, XFA, RENIEC) | Pendiente |
| v0.3.0 | OCR + conversión (Tesseract, PDF↔Word/Excel) | Pendiente |
| v0.4.0 | Edición avanzada + comparación versiones | Pendiente |
| v1.0.0 | Pro features + IA completa (resumir, Q&A, extraer) | Pendiente |

## Documentación

- [Spec de diseño](docs/superpowers/specs/2026-04-18-air-pdf-design.md)
- [Overview Fase 1](docs/superpowers/plans/2026-04-18-air-pdf-phase1-overview.md)
- [CLAUDE.md](CLAUDE.md) - contexto para sesiones de desarrollo

## Licencia

MIT — ver [LICENSE](LICENSE).
