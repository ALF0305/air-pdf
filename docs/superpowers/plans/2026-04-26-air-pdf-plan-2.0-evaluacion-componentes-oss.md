# AirPDF Plan 2.0 - Evaluacion de componentes OSS para acelerar v0.4+

**Fecha:** 2026-04-26
**Status:** Propuesto. Pendiente decision del usuario por item.
**Origen:** Investigacion web 2026-04-26 sobre lectores/editores PDF open source maduros.

## Contexto

air-pdf esta en v0.3.1, con paridad amplia frente a Acrobat Pro para flujo
clinico. El CHANGELOG declara explicitamente diferidos para v0.4+:

1. Password protection PDF (requiere qpdf externo o crate custom)
2. Firma digital PKCS#7/PAdES
3. Edicion de texto existente con reflow
4. Live preview de watermark / numeros de pagina
5. Code signing EV cert + auto-updater end-to-end

Este plan NO inventa features. Solo mapea componentes OSS encontrados a
los huecos ya conocidos, con licencias compatibles MIT/Apache (la app es MIT).

## Componentes evaluados

| Componente | Licencia | Cubre hueco | Decision sugerida |
|---|---|---|---|
| `qpdf-rs` (sobre `qpdf` C++) | Apache-2.0 / MIT | #1 password, optimizacion lossless | Adoptar en v0.4 |
| `pdf_signing` (Rust) | revisar | #2 firma PKCS#7 basica | Spike de 1 dia, decidir |
| `EmbedPDF` (PDFium WASM) | MIT | Reemplazo opcional de PDF.js como visor | PoC en rama, medir antes |
| `Stirling-PDF` | MIT core (subdirs no) | Catalogo de UX | Solo referencia conceptual, NO fork |
| `react-pdf-highlighter-plus` | MIT | Capa de anotaciones si seguimos con PDF.js | Solo si NO migramos a EmbedPDF |
| `pdf-lib` (JS) | MIT | Operaciones client-side puras | No prioritario, ya cubierto en backend |
| `pdfme` | MIT | Plantillas de formularios | Diferir a Plan 3 (formularios editables) |
| MuPDF / PyMuPDF | AGPL | n/a | DESCARTADO (incompatible con MSI cerrado) |
| PDFsam, PDF Arranger | AGPL / GPL-3.0 | n/a | DESCARTADO como dependencia (solo inspiracion visual) |

## Sub-planes

### Sub-plan 2.0.A - Password protection PDF (qpdf-rs)

**Goal:** Cubrir el item #1 del backlog v0.4. Permitir cifrar/descifrar PDFs
con password de usuario y de propietario, niveles AES-128 y AES-256.

**Riesgos:**
- `qpdf` es un binding C++. Requiere `libqpdf` instalado o vendored.
  Validar que `cargo build` en Windows + CI siga funcionando sin SDK extra.
- Tamano del bundle MSI puede crecer. Medir antes/despues.

**Tasks:**

| # | Task | Archivos |
|---|---|---|
| A1 | Spike: agregar `qpdf-rs` a `Cargo.toml`, build local en Windows | `src-tauri/Cargo.toml` |
| A2 | Documentar requerimiento de `libqpdf` (vendored o system) | `docs/architecture/build-deps.md` (nuevo) |
| A3 | Modulo `pdf::security` con `encrypt_pdf` y `decrypt_pdf` | `src-tauri/src/pdf/security.rs` |
| A4 | Comandos Tauri `pdf_encrypt`, `pdf_decrypt` | `src-tauri/src/commands/security.rs` |
| A5 | Tests: cifrar, abrir con password, fallo con password incorrecto | mismo modulo |
| A6 | UI: dialog "Proteger con contrasena" en menu Archivo | `src/components/dialogs/PasswordDialog.tsx` |
| A7 | UI: detectar PDF cifrado al abrir y pedir password | hook en open flow |
| A8 | Documentar en CHANGELOG y user-guide | `CHANGELOG.md`, `docs/user-guide/` |

**Definition of done:** abrir un PDF protegido con Acrobat usando AirPDF
y poder editarlo + guardar manteniendo cifrado.

### Sub-plan 2.0.B - Firma digital PKCS#7 basica

**Goal:** Item #2 del backlog. Empezar SIN PAdES completo, solo firma
PKCS#7 detached con certificado autoemitido o RENIEC P12.
PAdES-LTV queda para Plan 4 cuando RENIEC tramite este resuelto.

**Decision pendiente:** Confirmar con Alfredo si quiere bloquearse en
RENIEC PKI o avanzar con PKCS#7 generico ya, sumando RENIEC despues.

**Tasks:**

| # | Task | Archivos |
|---|---|---|
| B1 | Spike: clonar y compilar `pdf_signing`, evaluar madurez | repo externo |
| B2 | Si no es viable, evaluar `pkcs7` + `pdf` crates manual | spike doc |
| B3 | Modulo `pdf::sign` con `sign_pdf_pkcs7` | `src-tauri/src/pdf/sign.rs` |
| B4 | Comando Tauri `pdf_sign` con path al .p12 + password | `src-tauri/src/commands/sign.rs` |
| B5 | Tests con cert autoemitido (openssl genrsa + req + pkcs12) | `tests/fixtures/test-cert.p12` |
| B6 | UI: dialog "Firmar PDF" con selector de cert + posicion visual | `src/components/dialogs/SignDialog.tsx` |
| B7 | Verificar firma se valida en Acrobat Reader | manual QA |
| B8 | ADR `0002-firma-digital-alcance.md` documentando que NO hay PAdES-LTV | `docs/decisions/` |

**Definition of done:** Firmar un PDF con cert autoemitido y que Acrobat
Reader muestre la firma como valida (con warning de cert no confiable, esperado).

### Sub-plan 2.0.C - Evaluacion EmbedPDF como visor (PoC)

**Goal:** Decidir si reemplazamos PDF.js por EmbedPDF en el frontend.
**No es migracion**, es spike de evaluacion. Decision al final del spike.

**Por que tiene sentido evaluarlo:**
- EmbedPDF compila PDFium a WASM. Es el MISMO motor que ya usamos en
  backend via `pdfium-render`. Render mas consistente entre la vista
  previa y los PDFs guardados.
- Plugin-based, tree-shakable, anotaciones y redaction ya hechas.
- Licencia MIT.

**Por que podria NO hacerse:**
- PDF.js ya funciona, esta integrado, y el equipo lo conoce.
- Bundle size de PDFium WASM es ~6-8MB, vs PDF.js ~2MB.
- Riesgo de regresiones en flujos que ya pasan tests.

**Tasks:**

| # | Task | Archivos |
|---|---|---|
| C1 | Crear rama `spike/embedpdf-viewer` | git |
| C2 | Instalar EmbedPDF en `src/lib/pdf-viewer-spike/` paralelo al actual | nuevo dir |
| C3 | Renderizar 3 PDFs de prueba (paper, expediente, brochure) en una ruta `/spike/embedpdf` | nueva pagina |
| C4 | Medir: tiempo a primer render, fluidez de scroll en doc 200+ pags, bundle size, RAM | doc en plan |
| C5 | Probar interop con anotaciones existentes en `.airpdf.json` | manual |
| C6 | Documentar resultados en `docs/superpowers/specs/2026-04-26-embedpdf-evaluacion.md` | nuevo |
| C7 | Decision: GO / NO-GO con criterios cuantitativos | ADR `0003-visor-pdf.md` |

**Definition of done:** ADR firmado con decision GO o NO-GO basada en
metricas, no en intuicion.

### Sub-plan 2.0.D - Live preview de watermark / numeros de pagina

**Goal:** Item #4 del backlog. NO requiere componente externo nuevo,
es trabajo de UI sobre los comandos backend que ya existen.

Incluido aqui para que el plan v0.4 quede completo. Tasks D1-D5 son
puramente frontend (renderizar el watermark sobre el visor antes de
aplicarlo al PDF). Diseno detallado al ejecutar.

### Sub-plan 2.0.E - Stirling-PDF como referencia conceptual

**Accion unica:** Generar `docs/superpowers/specs/2026-04-26-stirling-features-mapping.md`
con la lista completa de operaciones que Stirling-PDF ofrece (60+),
clasificadas en:

- Ya en air-pdf v0.3.1 (la mayoria)
- Pendiente backlog declarado
- Nueva idea, evaluar prioridad
- No aplica al caso de uso clinico

Sin tocar codigo. Solo benchmarking de scope.

## Orden de ejecucion (decidido 2026-04-26 por Alfredo: firma al final)

1. **2.0.E** mapping Stirling (1 dia, sin riesgo, da claridad de scope)
2. **2.0.A** password con qpdf-rs (alto valor, complejidad media)
3. **2.0.C** spike EmbedPDF (rama separada, no bloquea main)
4. **2.0.D** live preview watermark (UI puro, sin nuevas deps)
5. **2.0.B** firma PKCS#7 (al final, mayor riesgo + decision RENIEC pendiente)

## Riesgos transversales

| Riesgo | Mitigacion |
|---|---|
| `libqpdf` complica el build en Windows | Sub-plan 2.0.A documenta build, si se complica se usa CLI qpdf como fallback temporal |
| `pdf_signing` no esta mantenido | Spike B1 evalua antes de comprometerse; alternativa: implementar con `pkcs7` + `pdf` crates |
| EmbedPDF cambia API en versiones futuras | Wrapper propio en `src/lib/pdf-viewer/` aisla la dependencia |
| Bundle MSI crece >40MB | Medir en cada spike; PDFium WASM puede cargarse lazy si solo se usa en visor |

## Cumplimiento legal

- Crear `docs/legal/THIRD_PARTY_LICENSES.md` (este plan lo incluye como
  precondicion). Listado completo de deps con licencia.
- Crear `docs/legal/NOTICE` con atribuciones requeridas (Apache-2.0
  obliga si se distribuye binario con qpdf).
- Verificar que el README mencione MIT y enlace al NOTICE.

## Resultado esperado

`v0.4.0` cubre:
- Cifrado/descifrado de PDFs (qpdf-rs)
- Firma digital PKCS#7 con cert local (decision pendiente sobre RENIEC)
- Live preview de watermark
- Decision documentada sobre EmbedPDF (GO o NO-GO)
- Cero deuda legal (LICENSES + NOTICE en orden)

`v0.5+` puede entonces atacar:
- PAdES-LTV con RENIEC
- EmbedPDF migracion completa (si fue GO)
- Edicion de texto con reflow (Plan 4 ya planeado)

## Referencias

- Investigacion web base: ver mensaje del usuario 2026-04-26 que originó este plan
- EmbedPDF: https://github.com/embedpdf/embed-pdf-viewer
- qpdf-rs: https://github.com/ancwrd1/qpdf-rs
- pdf_signing: https://github.com/ralpha/pdf_signing
- Stirling-PDF: https://github.com/Stirling-Tools/Stirling-PDF
- ADR existente firma RENIEC: `docs/decisions/firma-digital-reniec-tramite.md`
- ADR existente edicion texto: `docs/decisions/0001-text-editing-limitations.md`
