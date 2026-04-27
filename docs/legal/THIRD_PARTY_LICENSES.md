# Licencias de terceros

AirPDF es software libre publicado bajo licencia MIT. Incorpora componentes
open source de terceros con sus propias licencias. Este documento lista los
componentes mas significativos y sus licencias. La lista completa de
dependencias transitivas puede generarse con:

```bash
# Frontend
pnpm licenses list

# Backend (requiere cargo-license: cargo install cargo-license)
cd src-tauri && cargo license
```

Este archivo se mantiene manualmente y debe actualizarse cuando se agregan
o eliminan dependencias significativas.

## Licencia de AirPDF

MIT License — ver `LICENSE` en la raiz del repositorio.

## Componentes de runtime - Backend (Rust)

| Componente | Version | Licencia | Notas |
|---|---|---|---|
| Tauri | 2.x | MIT / Apache-2.0 | Framework principal |
| pdfium-render | 0.9 | MIT | Wrapper Rust de PDFium |
| PDFium | bundled | Apache-2.0 / BSD-3-Clause | Motor de PDF de Google/Foxit. Binario distribuido con la app (~7 MB) |
| lopdf | 0.34 | MIT | Manipulacion estructural de PDFs |
| image | 0.25 | MIT / Apache-2.0 | Procesamiento de imagenes |
| serde / serde_json | 1.x | MIT / Apache-2.0 | Serializacion |
| tokio | 1.x | MIT | Runtime async |
| reqwest | 0.12 | MIT / Apache-2.0 | HTTP client (rustls, sin OpenSSL) |
| rustls | (transitiva) | MIT / Apache-2.0 / ISC | TLS sin dependencia de OpenSSL |
| chrono | 0.4 | MIT / Apache-2.0 | Fechas |
| sha2 | 0.10 | MIT / Apache-2.0 | Hashing para sidecar |
| dirs | 5 | MIT / Apache-2.0 | Rutas de usuario |
| once_cell | 1.x | MIT / Apache-2.0 | Inicializacion lazy |
| toml | 0.8 | MIT / Apache-2.0 | Parsing de config |
| thiserror | 1.x | MIT / Apache-2.0 | Errores ergonomicos |

### Plugins Tauri

| Plugin | Licencia |
|---|---|
| tauri-plugin-opener | MIT / Apache-2.0 |
| tauri-plugin-dialog | MIT / Apache-2.0 |
| tauri-plugin-fs | MIT / Apache-2.0 |
| tauri-plugin-updater | MIT / Apache-2.0 |
| tauri-plugin-process | MIT / Apache-2.0 |

### Herramientas externas invocadas

| Herramienta | Licencia | Cuando se usa |
|---|---|---|
| Tesseract OCR | Apache-2.0 | OCR de PDFs escaneados (modulo opcional) |
| Leptonica | BSD-2-Clause | Dependencia de Tesseract |

## Componentes de runtime - Frontend (TS / React)

| Componente | Version | Licencia |
|---|---|---|
| React | 19 | MIT |
| React DOM | 19 | MIT |
| Vite | 7 | MIT |
| TypeScript | 5.8 | Apache-2.0 |
| Tailwind CSS | 3 | MIT |
| Zustand | 5 | MIT |
| pdfjs-dist (PDF.js) | 4 | Apache-2.0 |
| @dnd-kit/core, sortable, utilities | 6 / 10 / 3 | MIT |
| @radix-ui/* (dialog, dropdown-menu, label, scroll-area, separator, slot, tooltip) | varios | MIT |
| lucide-react | 1 | ISC |
| react-window | 2 | MIT |
| class-variance-authority | 0.7 | Apache-2.0 |
| clsx | 2 | MIT |
| tailwind-merge | 3 | MIT |

### shadcn/ui

shadcn/ui no es una dependencia npm; es codigo copiado al repo bajo MIT.
Ver `components.json` y `src/components/ui/`.

## Componentes propuestos para v0.4+ (no integrados aun)

Listados aqui para evaluacion. Solo se agregan al binario al ser adoptados.

| Componente | Licencia | Estado |
|---|---|---|
| qpdf-rs (sobre libqpdf) | MIT / Apache-2.0 | Spike pendiente (Plan 2.0.A) |
| pdf_signing | revisar | Spike pendiente (Plan 2.0.B) |
| EmbedPDF | MIT | PoC pendiente (Plan 2.0.C) |
| leptess o tesseract-rs | MIT / Apache-2.0 | Posible reemplazo de invocacion CLI a Tesseract |

## Componentes descartados explicitamente

| Componente | Licencia | Razon de descarte |
|---|---|---|
| MuPDF / mupdf-wasm | AGPL-3.0 o comercial | Incompatible con distribucion MSI bajo MIT |
| PyMuPDF | AGPL-3.0 | Mismo problema que MuPDF |
| PDFsam Basic | AGPL-3.0 | No utilizable como dependencia |
| PDF Arranger | GPL-3.0 | No utilizable como dependencia |
| Stirling-PDF (codigo de subdirs `proprietary/`, `desktop/`, `saas/`, `engine/`) | varias propietarias | Solo el `core` es MIT; los subdirs tienen LICENSE propios. Se usa solo como referencia conceptual, no como fork. |

## Como verificar el cumplimiento

1. Antes de cada release, ejecutar `cargo license --json > licenses-rust.json`
   y `pnpm licenses list --json > licenses-js.json`. Auditar cualquier
   licencia distinta a MIT, Apache-2.0, BSD, ISC, MPL-2.0.
2. Cualquier dependencia GPL/AGPL/SSPL debe rechazarse o aislarse en
   un proceso separado invocado por CLI (no enlazado).
3. Para componentes Apache-2.0, asegurar que `NOTICE` propaga las
   atribuciones requeridas.

## Reportar omisiones

Si identificas un componente que deberia estar listado aqui y no lo esta,
abre un issue en el repo con la etiqueta `legal` o avisa a Alfredo Pachas.
