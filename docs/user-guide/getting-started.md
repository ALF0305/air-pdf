# AirPDF - Guía rápida

## Primer uso

1. Instalar `AirPDF-0.1.0-setup.msi`
2. Abrir AirPDF desde el menú Inicio
3. File → Abrir, o Ctrl+O, o arrastrar PDF a la ventana

## Flujos comunes

### Anotar un paper médico

1. Abrí el paper (Ctrl+O o drag-drop)
2. Click en sidebar izquierda → pestaña "Anotaciones"
3. En la toolbar de anotaciones, elegí una herramienta:
   - **Resaltar (H):** arrastrá sobre el texto
   - **Nota (N):** arrastrá un área, escribí texto en el prompt
   - **Dibujo (P):** arrastrá con el mouse (ideal para tablet/stylus)
   - **Sello:** click en la página, elegí APROBADO/REVISADO/etc
4. Elegí color y categoría en la toolbar
5. Sidebar derecha muestra todas las anotaciones (filtro por categoría)
6. Botón "MD" exporta anotaciones a Markdown para tu vault Obsidian
7. Botón "PDF" embebe anotaciones en un PDF nuevo (interoperable con Acrobat)

### Revisar formulario y firmar

1. Abrí el formulario PDF
2. Usá el Pen tool (P) para firmar a mano
3. Click → Sello → "APROBADO" (verde) sobre el documento
4. Ctrl+S guarda anotaciones en sidecar (no modifica el PDF original)
5. Para enviar: click "PDF" en el panel de anotaciones → se genera una copia con anotaciones embebidas

### Rotar página escaneada

1. Navegá a la página que está de costado
2. En la toolbar superior, click en "Rotar derecha" (o izquierda)
3. Confirmá → se crea `.bak` + snapshot en version history
4. La ventana se recarga con la página rotada

### Extraer páginas específicas a PDF nuevo

1. Navegá a la página que querés extraer
2. Click en icono "tijera" (Extraer)
3. Elegí dónde guardar el PDF nuevo
4. Sólo esa página queda en el archivo nuevo

### Combinar múltiples PDFs

*Disponible en v0.2.0 con MergePdfsDialog.*

### Buscar texto en el PDF

1. Ctrl+F
2. Escribí el texto
3. Opcional: marcar "Distinguir mayúsculas"
4. Click en resultado → te lleva a esa página

## Auto-save y backups

Tu trabajo está protegido de 3 formas:

- **Version history:** `%APPDATA%/AirPDF/versions/<nombre>/<timestamp>.pdf`
  - Últimas 10 versiones de cada PDF modificado
  - Se crea automáticamente antes de cada rotación/eliminación
- **Backup `.bak`:** junto al PDF, antes de cada modificación in-place
- **Sidecar `.airpdf.json`:** anotaciones NUNCA modifican el PDF original

Si algo sale mal, siempre podés restaurar desde la carpeta de versiones.

## Integración con Claude Code

Si tenés Claude Code instalado (`claude` en PATH), AirPDF lo detecta automáticamente al iniciar y muestra "Modo Pro" en el StatusBar. Próximamente: funciones IA integradas (resumir, Q&A, extraer datos).

## Privacidad

AirPDF es local-first. Tus PDFs médicos no salen de tu PC salvo que vos explícitamente lo autorices. Cumple Ley 29733 por diseño.

## Atajos esenciales

```
Ctrl+O          Abrir PDF
Ctrl+W          Cerrar tab
Ctrl+F          Buscar
F11             Modo lectura
PgDn / PgUp     Navegar páginas
Ctrl+Home/End   Primera/última página
H / U / N / P / S   Tools (highlight/underline/note/pen/select)
Delete          Eliminar anotación seleccionada
Ctrl+wheel      Zoom
```

## Dónde están tus datos

- **PDFs y anotaciones (sidecar):** junto al PDF original
- **Settings:** `%APPDATA%/AirPDF/settings.toml`
- **Recent files:** `%APPDATA%/AirPDF/recent.json`
- **Version history:** `%APPDATA%/AirPDF/versions/<stem>/`
- **Auto-save:** `%APPDATA%/AirPDF/autosave/` (pendiente v0.1.1)

## Troubleshooting

**La ventana no abre:**
- Verificar que Visual C++ Redistributable está instalado
- Verificar que `pdfium.dll` está en la carpeta de instalación

**No veo Modo Pro:**
- Claude Code debe estar en PATH
- Abrir Command Prompt y ejecutar `claude --version` — si falla, reinstalar Claude Code

**Anotaciones no se persisten:**
- Verificar permisos de escritura en la carpeta del PDF
- El sidecar se crea como `<nombre>.pdf.airpdf.json` junto al PDF
