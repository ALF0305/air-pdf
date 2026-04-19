---
title: AirPDF - Diseño técnico
date: 2026-04-18
status: approved
author: Alfredo Pachas + Claude
project: air-pdf
phase: 1
---

# AirPDF - Diseño técnico

Reemplazo completo de Adobe Acrobat Pro y Xodo, standalone, instalable en cualquier PC Windows, con IA opcional cuando hay Claude Code o API key.

## 1. Resumen ejecutivo

### 1.1 Visión

Construir una aplicación de escritorio Windows que iguale o supere a Adobe Acrobat Pro y Xodo en funcionalidad, agregando integración nativa con IA (Claude API/Claude Code/Ollama) y con el ecosistema de Alfredo (vault Obsidian, MCPs, historial-clinico-npcer).

### 1.2 Objetivos

- Reemplazar Acrobat Pro completamente para uso personal y profesional de Alfredo
- Instalable en múltiples PCs Windows (casa + oficina) con un solo MSI
- Funcionar 100% standalone sin dependencias obligatorias
- Activar features de IA solo cuando hay credenciales/herramientas disponibles
- Cumplir con Ley 29733 (datos personales/médicos en Perú): local-first, sin telemetría, sin cloud forzado
- Cero costo de licencia, cero suscripciones, cero lock-in

### 1.3 Stack tecnológico

- **Framework desktop:** Tauri 2.x (Rust + WebView)
- **Frontend:** React 18 + TypeScript + Vite
- **Estado:** Zustand
- **Estilos:** Tailwind CSS + shadcn/ui
- **PDF render (frontend):** PDF.js (Mozilla)
- **PDF engine (backend):** PDFium via pdfium-render (Rust)
- **PDF edit ligero:** pdf-lib (TypeScript)
- **OCR (Fase 3):** Tesseract via tesseract-rs
- **Conversión (Fase 3):** LibreOffice headless + Pandoc
- **Testing:** Vitest + Cargo test + Playwright
- **CI/CD:** GitHub Actions
- **Empaquetado:** Tauri bundler (.msi + portable .exe)
- **Auto-update:** Tauri updater + GitHub Releases

### 1.4 Modelo de distribución

Un único instalador `AirPDF-vX.Y.Z-setup.msi` (~20MB) que:

1. Se instala en cualquier PC Windows sin dependencias
2. Detecta al iniciar:
   - Claude Code instalado -> activa "Modo Pro" (MCPs, vault, skills)
   - `ANTHROPIC_API_KEY` en env -> activa IA cloud
   - Ollama corriendo en localhost -> ofrece IA local
   - Nada de lo anterior -> modo standalone sin IA (funciona 100%)
3. Auto-update vía GitHub Releases (signed)
4. Settings persistentes en `%APPDATA%\AirPDF\settings.toml` con sync opcional a Dropbox

### 1.5 Principios

1. **Local-first:** ningún PDF sale de la PC sin consentimiento explícito por archivo
2. **Sin telemetría:** cero tracking, cero analytics
3. **Sin licencias:** open source para uso personal/profesional de Alfredo
4. **Sin suscripciones:** nunca
5. **Cumple Ley 29733:** PDFs médicos seguros por diseño
6. **No-loss editing:** archivo original nunca se modifica sin confirmación; modo sidecar default

## 2. Fase 1: Lectura + Edición

**Duración estimada:** 2-3 semanas. Producto final: `AirPDF-v0.1.0-setup.msi` instalable que reemplaza a Acrobat para leer y editar PDFs.

### 2.1 App shell

- Ventana principal con: barra de menú, toolbar superior, sidebar izquierda (thumbnails + bookmarks + anotaciones), área central (PDF viewer), sidebar derecha contextual
- Multi-tab: abrir varios PDFs en pestañas
- Recent files (últimos 20)
- Drag & drop de archivos
- Asociar `.pdf` como aplicación default (opcional, durante instalación)
- Atajos de teclado Acrobat-compatible
- Settings persistentes en `%APPDATA%\AirPDF\settings.toml`

### 2.2 Lectura y navegación

| Feature | Comportamiento |
|---|---|
| Visor con zoom | Ctrl+rueda, fit-width, fit-page, 100%, custom % |
| Thumbnails laterales | Sidebar izq, click para saltar, drag para reordenar |
| Bookmarks navegables | Lee bookmarks del PDF, sidebar dedicada |
| Búsqueda en PDF | Ctrl+F, highlight de matches, regex opcional |
| Modo lectura | F11, oculta UI, solo PDF + scroll, ESC sale |
| Ajuste tipográfico | Para PDFs reflowables |
| Navegación página | Ctrl+G ir a página, PgUp/PgDn, Home/End |
| Multi-vista | 1 página, 2 páginas (libro), continuo |
| Histórico navegación | Alt+Left/Right |

**Excluido:** dark mode.

### 2.3 Anotaciones

| Feature | Comportamiento |
|---|---|
| Highlights por categorías | 8 colores + categorías nombradas |
| Subrayado/tachado/underline | Toolbar de selección |
| Notas marginales | Ícono en margen, panel lateral con texto |
| Dibujo libre (pen tool) | Grosor, color, opacidad |
| Sellos | Predefinidos + custom |
| Cuadros y flechas | Shape tools |
| Lista de anotaciones | Sidebar con filtro por categoría/tipo |
| Exportar anotaciones | Markdown (Obsidian), JSON, PDF resumen |
| Importar anotaciones | Sidecar .airpdf.json portable |

**Modos de almacenamiento:**
- **Sidecar (default):** `paciente.pdf.airpdf.json` junto al PDF
- **Embedded:** dentro del PDF (interoperable con Acrobat)

### 2.4 Edición de páginas

Agregar, quitar, reordenar (drag), rotar, duplicar, extraer, dividir, combinar.

### 2.5 Edición de contenido (ligera)

Editar texto existente, cambiar fuente/color/tamaño, agregar texto, mover/reemplazar/eliminar imágenes. **Edición avanzada (reflow, tablas) en Fase 4.**

### 2.6 Guardar y backup

- Ctrl+S con backup .bak en primera modificación
- Auto-save cada 5 min a `%APPDATA%\AirPDF\autosave\`
- Historial de últimas 10 versiones

### 2.7 Excluido de Fase 1

Formularios complejos (Fase 2), firmas digitales (Fase 2), OCR (Fase 3), conversión (Fase 3), comparación visual (Fase 4), IA (Fase 5, integrada progresivamente), redacción permanente (Fase 5).

## 3. Roadmap Fases 2-5

### 3.1 Fase 2 - Formularios y firmas (semanas 4-5)
Rellenar AcroForm/XFA, auto-fill desde perfiles, bulk CSV fill, firma manuscrita/imagen/digital RENIEC. Release `v0.2.0`.

### 3.2 Fase 3 - OCR y conversión (semanas 6-7)
Tesseract OCR, PDF <-> Word/Excel/PPT/imágenes/markdown, comprimir. Release `v0.3.0`.

### 3.3 Fase 4 - Edición avanzada y comparación (semanas 8-9)
Edición sobre PDFs escaneados, reflow, tablas, comparar versiones, bates numbering, marca de agua, recortar. Release `v0.4.0`.

### 3.4 Fase 5 - Pro features e IA integrada (semanas 10-12)
Contraseñas, redacción permanente, metadata scrub, crear formularios, sellos custom, PDF/UA, preflight. IA transversal completa (resumir, Q&A, extraer JSON, traducir, comparar semántico, anonimizar, vault/MCP integration). Release `v1.0.0`.

### 3.5 Cronograma

```
Sem 1-3:   Fase 1 - Lectura + Edición          [v0.1.0]
Sem 4-5:   Fase 2 - Formularios + Firmas       [v0.2.0]
Sem 6-7:   Fase 3 - OCR + Conversión           [v0.3.0]
Sem 8-9:   Fase 4 - Edición avanzada + Diff    [v0.4.0]
Sem 10-12: Fase 5 - Pro + IA completa          [v1.0.0]
```

## 4. Arquitectura técnica

### 4.1 Estructura del proyecto

```
air-pdf/
├── README.md, CLAUDE.md, LICENSE, .gitignore
├── package.json, tsconfig.json, vite.config.ts
├── tailwind.config.ts, postcss.config.js
├── components.json
├── docs/
│   ├── superpowers/specs/
│   ├── superpowers/plans/
│   ├── architecture/
│   ├── decisions/
│   └── user-guide/
├── src-tauri/
│   ├── Cargo.toml, tauri.conf.json, build.rs
│   └── src/
│       ├── main.rs, lib.rs, error.rs
│       ├── commands/ (pdf, pages, annotations, search, content_edit, settings)
│       ├── pdf/ (engine, document, editor, renderer, extractor)
│       ├── storage/ (sidecar, settings, recent, autosave, version_history)
│       └── integrations/ (claude_code, claude_api, ollama)
├── src/
│   ├── main.tsx, App.tsx, index.css
│   ├── components/ (viewer, sidebar, toolbar, annotations, editor, tabs, dialogs, menu, statusbar, shared, ui)
│   ├── hooks/ stores/ lib/ types/ styles/
├── tests/ (unit, integration, e2e, fixtures)
├── installers/windows/
├── scripts/
└── .github/workflows/
```

### 4.2 Diagrama de componentes

```
Frontend (React + TS)
  Viewer (PDF.js) | Sidebar | Toolbar
            |
      Tauri invoke()
            |
Backend (Rust + Tauri)
  PDF Engine (PDFium) | Storage | Integrations
```

### 4.3 Decisiones técnicas clave

| Decisión | Elección | Justificación |
|---|---|---|
| Framework | Tauri 2.x | Binario ~15MB, rápido, Rust seguro |
| Frontend | React + TS + Vite | Maduro, hot reload |
| Estado | Zustand | Liviano |
| PDF render | PDF.js (Mozilla) | Battle-tested |
| PDF edit | pdf-lib + PDFium | Simple + complejas |
| OCR | Tesseract | Open source, multi-idioma |
| Estilos | Tailwind + shadcn/ui | Rápido + profesional |
| Testing | Vitest + Cargo + Playwright | Cubre frontend + backend + e2e |
| CI/CD | GitHub Actions | Build MSI automático |
| Auto-update | Tauri updater + GH Releases | Native, signed |

### 4.4 Formato sidecar .airpdf.json

```json
{
  "version": "1.0",
  "pdfHash": "sha256:abc...",
  "createdAt": "2026-04-18T10:30:00Z",
  "updatedAt": "2026-04-18T11:45:00Z",
  "annotations": [
    {
      "id": "uuid-1",
      "type": "highlight",
      "page": 3,
      "rect": [120, 450, 380, 470],
      "color": "#FFEB3B",
      "category": "Importante",
      "text": "...",
      "note": "Verificar dosis",
      "author": "Alfredo",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "bookmarksCustom": [],
  "metadata": {
    "tags": ["paciente", "neumonia"],
    "linkedObsidianNote": "[[Pacientes/JuanX]]"
  }
}
```

### 4.5 Detección de Claude Code

```rust
fn detect_mode() -> ClaudeMode {
    if which("claude").is_ok() && claude_version() >= "0.5.0" {
        return ClaudeMode::Pro { mcps: list_mcps() };
    }
    if env::var("ANTHROPIC_API_KEY").is_ok() {
        return ClaudeMode::CloudOnly;
    }
    if ollama_running() {
        return ClaudeMode::LocalOnly;
    }
    ClaudeMode::None
}
```

UI status bar: "Modo Pro" | "IA Cloud" | "IA Local" | sin badge.

## 5. Riesgos y mitigaciones

### 5.1 Riesgos técnicos

| Riesgo | Impacto | Prob | Mitigación |
|---|---|---|---|
| PDF spec con casos raros | Alto | Alta | PDFium + fallback vista degradada |
| Edición texto rompe layout | Alto | Alta | Fase 1 ligera; Fase 4 reflow |
| PDFium crashes | Medio | Media | Proceso separado, panic-safe |
| Tauri 2 inmadurez plugins | Medio | Media | Plugins core + Rust custom |
| Render lento PDFs grandes | Medio | Media | Lazy + virtualización |
| OCR Tesseract lento | Bajo F3 | Alta | Worker background, cancelable |
| Firma RENIEC compleja | Medio F2 | Media | v2.0: manuscrita/imagen; v2.5: digital |
| PDF->Word pierde calidad | Medio F3 | Alta | LibreOffice headless + warning |

### 5.2 Riesgos de scope

Scope creep, perfeccionismo, comparación Acrobat, olvido features. Mitigación: stick al plan, release cuando cumple specs, BACKLOG.md.

### 5.3 Riesgos de uso real

| Riesgo | Mitigación |
|---|---|
| Pérdida de datos | Auto-save + .bak + historial 10 |
| PDF original corrompido | Sidecar default, save-as primario |
| Sidecar perdido | Dropbox sync + opción embedded |
| PDF médico a IA cloud | Confirmación por archivo (Ley 29733) |
| Instalar en PC ajena | MSI estándar, sin telemetría |

### 5.4 Riesgos de mantenimiento

Alfredo no es full-time dev -> tests + CLAUDE.md + sesiones planificadas. Deps vulnerables -> Dependabot + audit. PDFium/pdf-lib cambios -> pin versions.

### 5.5 Plan de contingencia

- Fase 1 > 4 semanas -> mover features a F2
- PDFium problemas -> MuPDF fallback
- Edición F4 compleja -> LibreOffice como editor externo
- Firma digital bloqueante -> diferir a v2.0
- No llegar a 12 semanas para v1.0 -> v0.5 con F1-3

### 5.6 Criterios de éxito por fase

1. Features P1 funcionan
2. Tests >70% cobertura código nuevo
3. Probado con PDFs reales
4. MSI compila e instala limpio
5. No regresiones
6. Docs actualizadas
7. CLAUDE.md actualizado

## 6. Próximos pasos

1. Aprobación del spec
2. Plan de implementación Fase 1 (writing-plans)
3. Setup repo + scaffolding
4. Implementación iterativa con TDD
5. Release v0.1.0
6. Uso real + feedback
7. Fase 2

## 7. Glosario

- **AcroForm:** formato estándar de formularios PDF
- **XFA:** Adobe forms dinámicos
- **PDFium:** engine de Chrome, open source
- **PDF/UA:** estándar accesibilidad
- **PDF/A:** archivado largo plazo
- **Sidecar:** archivo complementario sin modificar PDF
- **Tauri:** framework desktop Rust + web
- **MCP:** Model Context Protocol (Claude Code)
