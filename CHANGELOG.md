# AirPDF Changelog

## 0.3.0 (2026-04-19)

Release con foco en workflow clínico y productividad.

### Nuevas herramientas
- **Sello de texto** con presets (APROBADO, BORRADOR, CONFIDENCIAL, REVISADO,
  ANULADO, ORIGINAL, COPIA) + fecha automática + posición configurable
  (7 posiciones)
- **Historial de versiones** (Ctrl+Z) con restauración de cualquier snapshot
- **Editor de marcadores (TOC)** — añadir/renombrar/reordenar/eliminar entradas
- **Comparar dos PDFs** línea por línea, resaltando solo en A / solo en B
- **Campos de formulario (AcroForm)** read-only para inspección
- **Redacción real** — dibuja rects con categoría `REDACT` y aplica para
  cubrir con negro opaco (reusa herramienta de anotación existente)
- **OCR con Tesseract** para PDFs escaneados (historias clínicas en papel).
  Soporta múltiples idiomas (spa+eng por defecto)
- **Preguntar a Claude** (IA) — envía el texto del PDF a Claude con tu API key.
  Presets: Resumen breve, Resumen para paciente, Extraer conclusiones, Analizar
  metodología

### UX
- **Modo oscuro** (Ctrl+Shift+D) con persistencia
- **Modo presentación** (Ctrl+L) reutilizando modo lectura
- **Zoom con teclado**: Ctrl++/Ctrl+=/Ctrl+-/Ctrl+0
- Menú **Ayuda** con atajos (F1) y Acerca de

### Diferido a v0.4
- Password protection PDF (requiere qpdf externo o crate custom)
- Firma digital PKCS#7/PAdES (requiere crypto deps)
- Edición de texto existente (parsing de content streams)
- Live preview de watermark/números de página
- Code signing EV cert + auto-updater

---

## 0.2.0 (2026-04-19)

Major feature release. Pasa de "lector + anotaciones + operaciones básicas de página"
a un editor de PDFs con cobertura amplia de casos de uso equivalentes a Adobe Acrobat Pro.

### Nuevas operaciones de página
- Duplicar página actual (toolbar + menú)
- Insertar página en blanco A4 después de la actual (toolbar + menú)
- Reordenar páginas por drag-and-drop en el panel de miniaturas
- Rotar documento completo 90°, -90° o 180°
- Recortar márgenes uniformes (CropBox) en todas las páginas

### Conversión y exportación
- Exportar páginas como imágenes (PNG o JPG) con DPI configurable (72/150/300)
- Crear PDF desde varias imágenes (drag para ordenar, centrado automático en A4)
- Extraer texto plano del PDF a archivo .txt / .md (separado por página)

### Estampado
- Marca de agua diagonal ("CONFIDENCIAL") con texto, tamaño y opacidad configurables
- Números de página con formato personalizable (ej. `{n} / {total}`)
- Estampar imagen/firma en posición y tamaño configurables (para firmar informes)

### Metadatos y organización
- Editor de propiedades del documento (título, autor, asunto, palabras clave)
- Comprimir PDF (optimización de streams) mostrando antes/después
- Guardar con anotaciones embebidas (flatten a copia nueva)
- Guardar como copia (duplicar archivo a nueva ubicación)

### Redaction (backend listo)
- Tool backend para aplicar rectángulos negros opacos sobre contenido
  sensible. UI de dibujo pendiente para v0.3.

### UX
- Ir a página (Ctrl+G)
- Diálogo de atajos de teclado (F1)
- Diálogo "Acerca de AirPDF" con resumen de features
- Menú Ayuda nuevo
- Auto-guardado de snapshot de versión cada 5 min si hubo cambios
- Soft refresh: edits se reflejan sin recargar la ventana

### Backend
- Módulo `pdf/transform.rs` con 14 operaciones nuevas
- Comandos Tauri: `pages_duplicate`, `pages_insert_blank`,
  `pdf_export_page_image`, `pdf_export_all_images`, `pdf_from_images`,
  `pdf_set_metadata`, `pdf_compress`, `pdf_watermark`, `pdf_page_numbers`,
  `pdf_rotate_document`, `pdf_redact`, `pdf_crop_uniform`, `pdf_stamp_image`,
  `pdf_extract_text_to_file`

---

## 0.1.0 (2026-04-18)

Versión inicial con el core:

### Lectura
- Apertura de PDFs con pestañas
- Renderizado crisp (2x oversampling)
- Lazy loading con IntersectionObserver (800px rootMargin)
- Vistas: una página, dos páginas, continua (default)
- Zoom con controles
- Modo lectura (F11) pantalla completa sin chrome
- Drag & drop de archivos
- Archivos recientes
- Búsqueda (Ctrl+F) con navegación de resultados
- Panel lateral: miniaturas, tabla de contenido, versiones
- Status bar con contador de páginas

### Anotaciones
- Herramientas: resaltado (H), subrayado (U), tachado, nota (N),
  dibujo libre (P), caja, círculo, flecha, sello
- Selección (S) y eliminación (Supr) de anotaciones
- Categorías y colores personalizables
- Persistencia en archivo sidecar `.airpdf.json` junto al PDF
- Compatible con Acrobat/Xodo al exportar con "Guardar con anotaciones
  embebidas" (usa Annot dicts nativas de PDF)

### Edición de páginas
- Rotar, extraer, eliminar página actual (toolbar)
- Combinar múltiples PDFs con drag-to-reorder
- Dividir PDF en rangos (ej. `1-5, 8, 10-12`)
- Extraer páginas específicas a PDF nuevo

### Infraestructura
- Stack: Tauri 2 + React 19 + TypeScript + Vite 7 + Tailwind 3 +
  shadcn/ui + Zustand 5 + PDFium (pdfium-render 0.9 con thread_safe)
- Local-first, sin telemetría (cumple Ley 29733)
- Backups automáticos `.bak` antes de cada edit destructivo
- Versionado con snapshots en `.airpdf-history/`
- Multi-idioma: MSI en es-ES, en-US + NSIS .exe
- Tests: 30+ Rust tests + 7+ Vitest tests
