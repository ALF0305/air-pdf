# Issues conocidos v0.4 (encontrados en pruebas manuales 2026-04-28)

Lista de bugs y mejoras UX descubiertos por Alfredo al probar la
release de v0.4 (commits 9439ede..854fdae). Todos pendientes para
arreglar en batch en una proxima sesion.

## Severidad

- **bloqueante**: impide usar la feature
- **UX**: la feature funciona pero es engorrosa
- **performance**: funciona pero lento
- **feature**: no es bug, es funcionalidad nueva pedida

## Issues

### #1 - FreeText: default Arial 14 en vez de fuente del documento

- **Severidad**: UX
- **Sintoma**: al hacer click con la herramienta texto libre, el editor
  abre con fuente Arial tamano 14 fijo. El usuario tiene que probar
  manualmente cuál fuente y tamano coinciden con el documento.
- **Esperado**: detectar la fuente y tamano dominantes de la pagina
  actual (o del area cercana al click) y usarlos como default.
- **Estado**: parcialmente implementado. `pdf::extractor::detect_dominant_font`
  + `normalize_font_name` ya existen en codigo (no committeado, en
  rama local). Falta: comando Tauri, wrapper TS, hook en PageRenderer
  antes de mostrar FreeTextEditor.

### #2 - Imagenes: no quedan seleccionadas tras pegar

- **Severidad**: UX
- **Sintoma**: al pegar una imagen, el usuario tiene que cambiar
  manualmente a la herramienta "Seleccionar" para poder moverla o
  redimensionarla. La layer de anotaciones tiene `pointer-events: none`
  cuando la herramienta activa no es "select" ni interactiva.
- **Esperado**: comportamiento tipo Word/Office. Al pegar la imagen:
  1. Cambiar automaticamente la herramienta a "select"
  2. Seleccionar la nueva anotacion → mostrar manijas de resize
  3. Mostrar boton "Detras del texto" en la toolbar contextual
- **Fix sugerido**: en `PageRenderer.tsx` despues de `add({type:"image",...})`,
  llamar `setActiveTool("select")` y `selectAnnotation(newId)`.
  Lo mismo para FreeText. Aplicar simetricamente.

### #3 - Imagenes: opcion "Detras del texto" (incrustar en PDF)

- **Severidad**: feature
- **Sintoma**: las anotaciones siempre van encima del PDF. No hay
  forma rapida de poner una imagen como capa de fondo.
- **Esperado**: cuando una imagen esta seleccionada, mostrar boton
  "Detras del texto" o "Incrustar en PDF". Al click: invocar
  `stampImage` backend que ya existe → genera copia con la imagen
  como objeto del PDF (no anotacion) → recargar tab.
- **Nota**: ya existe `Estampar imagen...` en menu, pero el usuario no
  lo asocia a "imagen detras del texto". El boton contextual lo hace
  obvio.

### #4 - Anotaciones rect/circle/arrow: grosor del trazo no editable

- **Severidad**: UX
- **Sintoma**: al dibujar un rectangulo, circulo o flecha, el grosor
  del borde es fijo (2px hardcoded en AnnotationLayer.tsx). No hay
  control para cambiarlo.
- **Esperado**: en la toolbar de anotaciones, agregar un selector de
  grosor (slider o dropdown con 1, 2, 4, 6, 8 px). Persistir en cada
  anotacion creada. Al seleccionar una anotacion existente, permitir
  cambiarlo desde la barra contextual.
- **Cambios estimados**:
  - `Annotation` type: agregar `strokeWidth?: number` (default 2)
  - `AnnotationLayer.tsx` rect/circle/arrow: usar
    `border: ${a.strokeWidth ?? 2}px solid ${a.color}` en vez de `2px`
  - `AnnotationToolbar.tsx`: agregar control de grosor cuando tool
    es rect/circle/arrow
  - `annotationStore`: agregar `activeStrokeWidth` y setter

### #5 - Performance: detectar paginas en blanco lento en PDFs 40+

- **Severidad**: performance
- **Sintoma**: en un PDF de 47 paginas, la deteccion tarda varios
  segundos (~5-10s percibido). Cada pagina se procesa
  secuencialmente: text() + objects() de PDFium.
- **Fix sugerido**:
  - Opcion A: paralelizar con rayon. Cada pagina puede inspeccionarse
    en su propio thread (PDFium con `thread_safe` lo soporta).
  - Opcion B: streaming con feedback en UI ("revisado pagina X de Y")
    para que no parezca colgado.
  - Opcion C (mas simple): mostrar spinner + mensaje "esto puede tardar
    en PDFs grandes" para mejorar percepcion sin tocar perf.
- **Recomendacion**: A o C. A es real fix; C es low-effort y suficiente.

### #6 - "Imprimir" dificil de encontrar

- **Severidad**: UX
- **Sintoma**: el usuario no encontro el boton de imprimir. Esta en
  Archivo → Imprimir... (Ctrl+P), pero no es prominente.
- **Posibles fixes**:
  - Mover "Imprimir" mas arriba en menu Archivo (ahora esta entre
    "Guardar como copia" y "Combinar PDFs", queda diluido)
  - Agregar boton de impresora en la toolbar principal
  - Tooltip mas visible
- **Recomendacion**: boton de impresora en la toolbar principal cerca
  de Abrir/Guardar.

### #7 - Imprimir solo guarda como PDF, no muestra impresoras reales

- **Severidad**: bloqueante (funcion no cumple expectativa)
- **Sintoma**: al dar "Imprimir...", la app pasa el archivo al visor
  predeterminado de Windows que ofrece "Microsoft Print to PDF" o
  "Guardar como PDF", pero NO muestra el dialogo de impresoras reales
  (HP, Canon, Brother, etc. conectadas).
- **Causa raiz**: el comando backend usa
  `Start-Process -Verb Print` que abre el visor predeterminado y le
  pasa el verbo Print. Si el visor predeterminado es Edge o un PDF
  reader que esta configurado para imprimir a Microsoft Print to PDF
  por defecto, eso es lo que aparece.
- **Esperado**: dialog de impresion estandar de Windows con todas las
  impresoras conectadas (locales y de red), opcion para elegir paginas,
  copias, orientacion, calidad.
- **Fix sugerido (orden de simplicidad)**:
  - **A** (mas robusto): renderizar el PDF en un iframe del WebView
    via PDF.js y llamar `iframe.contentWindow.print()`. Chromium
    muestra su dialog nativo con todas las impresoras del sistema.
    Requiere cargar el PDF en un canvas y llamar a print desde JS.
  - **B** (intermedio): usar PDFium-render directamente para enviar
    cada pagina al GDI de Windows + invocar la API `PrintDlgW` para
    mostrar el dialog. Codigo Rust mas largo pero sin dependencia del
    visor predeterminado.
  - **C** (workaround minimo): cambiar `Start-Process -Verb Print` a
    `Start-Process -Verb PrintTo "PrinterName"` despues de mostrar un
    dropdown de impresoras del sistema en la UI. Al usuario le toca
    elegir antes en lugar de despues.
- **Recomendacion**: A. Es lo que esperan los usuarios y reusa el
  motor de impresion del WebView que Tauri ya tiene cargado.

### #8 - FreeText: Escape no guarda y el usuario no sabe como guardar

- **Severidad**: bloqueante (la feature parece rota desde la perspectiva del usuario)
- **Sintoma**: el usuario escribe texto en el FreeTextEditor y presiona Escape
  pensando que guardara. Escape cancela y pierde lo escrito. El usuario no
  encuentra como guardar.
- **Causa raiz**: convencion confusa
  - Enter (sin shift) = commit
  - Escape = cancel
  - Shift+Enter = nueva linea
  El usuario natural espera Escape o click fuera = guardar (como Word).
- **Esperado**: comportamiento Word-like
  - Click fuera del editor = guardar (no cancelar)
  - Escape = cancelar (con confirmacion si hay texto)
  - Enter = nueva linea (no guardar)
  - Boton "Guardar" claro
  - O al menos: tooltip explicito "Enter para guardar, Escape cancela"
- **Fix sugerido**:
  - Cambiar onBlur de FreeTextEditor para que commit en vez de cancel cuando
    hay texto.
  - Anadir tooltip arriba del editor: "Enter = guardar, Shift+Enter = nueva linea, Esc = cancelar"
  - Hacer mas visible el icono de check verde (mas grande, mejor color).

### #9 - FreeText: la fuente detectada no coincide con la del documento

- **Severidad**: UX (el fix #1 esta funcionando parcialmente)
- **Sintoma**: tras instalar v0.3.1 con los fixes, el editor abre con fuente
  pero NO es la del documento original. El usuario no tiene forma de
  verificar cual es la fuente real del PDF para comparar.
- **Causas posibles**:
  - El mapeo de `normalize_font_name` esta mapeando mal (ej. "TimesNewRomanPS-MT"
    podria caer en Arial si la heuristica falla)
  - El PDF usa una fuente subset que PDFium reporta como nombre raro
  - Hay multiples fuentes y la dominante no es la del parrafo del click
- **Necesidad complementaria**: herramienta para inspeccionar fuentes del PDF
  - Boton "Ver fuentes del documento" que liste por pagina las fuentes y
    tamanos detectados con su frecuencia
  - Asi el usuario puede verificar que `pdf_detect_dominant_font` reporta
    lo esperado vs lo que el ve en el PDF
- **Fix sugerido**:
  - Mejorar `normalize_font_name` para mas casos (debug con PDFs reales del
    usuario)
  - Anadir comando `pdf_list_fonts(path, page)` que devuelve `[{font, size, count}]`
    de la pagina. UI con dropdown "Fuentes detectadas en pagina actual" que
    el usuario puede ver
  - Considerar detectar la fuente del parrafo MAS CERCANO al click en vez de
    la dominante de toda la pagina (mas preciso)

## Plan sugerido para sesion de fix

Orden por valor / esfuerzo:

### Issues #1-#7 (RESUELTOS en sesion 2026-04-28):

1. **#2 + #3** imagenes Word-like + boton Incrustar — commit `08ad094`
2. **#4** grosor de trazo — commit `bbd5e22`
3. **#6** boton Imprimir en toolbar — commit `2081d1a`
4. **#5** loader blank pages — commit `37341a3`
5. **#1** fuente FreeText (parcialmente, ver #9) — commit `7aef507`
6. **#7** dialog impresoras (ruta C) — commit `22d461d`

### Issues #8-#9 (NUEVOS en testing 2026-04-28 noche):

7. **#8** FreeText: Escape no guarda, UX confuso — pendiente
8. **#9** Fuente detectada no coincide con documento + falta inspector — pendiente

Estimacion proxima sesion: 1-2 horas para #8 + #9.

## Origen

Lista construida durante session de pruebas manuales el 2026-04-28
con un PDF clinico real de 47 paginas. Las 7 features de v0.4
(password, watermark live preview, sanitize, auto-redact, blank pages,
linearize) funcionan correctamente; estos issues son sobre features
preexistentes (anotaciones, freetext, imagenes) y mejoras UX.
