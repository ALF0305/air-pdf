// Typed wrapper over Tauri invoke() for backend PDF commands.
import { invoke } from "@tauri-apps/api/core";
import type {
  PdfDocument,
  PdfPage,
  Bookmark,
  SearchResult,
} from "@/types/pdf";

interface PdfOpenResponse {
  info: {
    path: string;
    page_count: number;
    title: string | null;
    author: string | null;
    subject: string | null;
    creator: string | null;
    producer: string | null;
    is_encrypted: boolean;
  };
}

interface PageInfoResponse {
  page_number: number;
  width: number;
  height: number;
  rotation: number;
}

interface BookmarkResponse {
  title: string;
  page: number | null;
  children: BookmarkResponse[];
}

interface SearchMatchResponse {
  page: number;
  text: string;
  context: string;
  rect: [number, number, number, number];
}

export async function openPdf(path: string): Promise<PdfDocument> {
  const response = await invoke<PdfOpenResponse>("pdf_open", { path });
  return {
    id: crypto.randomUUID(),
    path: response.info.path,
    pageCount: response.info.page_count,
    title: response.info.title,
    author: response.info.author,
    isModified: false,
  };
}

export async function renderPage(
  path: string,
  pageIndex: number,
  scale: number
): Promise<Blob> {
  const bytes = await invoke<number[]>("pdf_render_page", {
    path,
    pageIndex,
    scale,
  });
  return new Blob([new Uint8Array(bytes)], { type: "image/png" });
}

export interface DominantFont {
  font: string;
  size: number;
  bold: boolean;
  italic: boolean;
}

/**
 * Detecta la fuente y tamano dominantes en una pagina del PDF.
 * Devuelve null si la pagina no tiene texto (escaneo sin OCR, por ejemplo).
 */
export async function detectDominantFont(
  path: string,
  pageIndex: number
): Promise<DominantFont | null> {
  return await invoke<DominantFont | null>("pdf_detect_dominant_font", {
    path,
    pageIndex,
  });
}

export async function extractPageText(
  path: string,
  pageIndex: number
): Promise<string> {
  return await invoke<string>("pdf_extract_text", { path, pageIndex });
}

export async function getPagesInfo(path: string): Promise<PdfPage[]> {
  const response = await invoke<PageInfoResponse[]>("pdf_get_pages_info", {
    path,
  });
  return response.map((p) => ({
    pageNumber: p.page_number,
    width: p.width,
    height: p.height,
    rotation: p.rotation as 0 | 90 | 180 | 270,
  }));
}

export async function getBookmarks(path: string): Promise<Bookmark[]> {
  const response = await invoke<BookmarkResponse[]>("pdf_get_bookmarks", { path });
  const map = (b: BookmarkResponse): Bookmark => ({
    title: b.title,
    page: b.page ?? 0,
    children: b.children.map(map),
  });
  return response.map(map);
}

export async function searchInPdf(
  path: string,
  query: string,
  caseSensitive: boolean
): Promise<SearchResult[]> {
  const response = await invoke<SearchMatchResponse[]>("pdf_search", {
    path,
    query,
    caseSensitive,
  });
  return response.map((m) => ({
    page: m.page,
    rect: m.rect,
    context: m.context,
  }));
}

// ====== Recent files ======

export interface RecentFile {
  path: string;
  lastOpened: string;
}

interface RecentFileResponse {
  path: string;
  last_opened: string;
}

interface RecentListResponse {
  files: RecentFileResponse[];
}

export async function getRecentFiles(): Promise<RecentFile[]> {
  const response = await invoke<RecentListResponse>("recent_list");
  return response.files.map((f) => ({
    path: f.path,
    lastOpened: f.last_opened,
  }));
}

export async function addRecentFile(path: string): Promise<void> {
  await invoke("recent_add", { path });
}

export async function clearRecentFiles(): Promise<void> {
  await invoke("recent_clear");
}

// ====== Settings ======

export interface SettingsData {
  general: {
    default_view_mode: string;
    default_zoom: string;
    recent_files_limit: number;
  };
  annotations: {
    storage_mode: string;
    sync_to_dropbox: boolean;
    default_author: string;
  };
  ai: {
    mode: string;
    confirm_before_cloud: boolean;
  };
}

export async function loadSettings(): Promise<SettingsData> {
  return await invoke<SettingsData>("settings_load");
}

export async function saveSettings(settings: SettingsData): Promise<void> {
  await invoke("settings_save", { settings });
}

// ====== AI mode detection ======

export type AiMode =
  | { type: "pro"; version: string }
  | { type: "cloud-only" }
  | { type: "local-only" }
  | { type: "none" };

export async function detectAiMode(): Promise<AiMode> {
  return await invoke<AiMode>("detect_ai_mode");
}

// ====== Annotations ======

import type { Annotation, AnnotationsSidecar } from "@/types/annotations";

interface BackendAnnotation {
  id: string;
  type: string;
  page: number;
  rect: [number, number, number, number];
  color: string;
  category?: string | null;
  text?: string | null;
  note?: string | null;
  author: string;
  createdAt: string;
  updatedAt: string;
  data?: unknown;
}

interface BackendSidecar {
  version: string;
  pdfHash: string;
  createdAt: string;
  updatedAt: string;
  annotations: BackendAnnotation[];
  bookmarksCustom: unknown[];
  metadata: { tags: string[]; linkedObsidianNote?: string | null };
}

function mapAnnotation(a: BackendAnnotation): Annotation {
  return {
    id: a.id,
    type: a.type as Annotation["type"],
    page: a.page,
    rect: a.rect,
    color: a.color,
    category: a.category ?? undefined,
    text: a.text ?? undefined,
    note: a.note ?? undefined,
    author: a.author,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    data: a.data,
  };
}

function mapSidecar(s: BackendSidecar): AnnotationsSidecar {
  return {
    version: s.version,
    pdfHash: s.pdfHash,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    annotations: s.annotations.map(mapAnnotation),
    bookmarksCustom: s.bookmarksCustom,
    metadata: {
      tags: s.metadata.tags,
      linkedObsidianNote: s.metadata.linkedObsidianNote ?? undefined,
    },
  };
}

function annotationToBackend(a: Annotation): BackendAnnotation {
  return {
    id: a.id,
    type: a.type,
    page: a.page,
    rect: a.rect,
    color: a.color,
    category: a.category ?? null,
    text: a.text ?? null,
    note: a.note ?? null,
    author: a.author,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    data: a.data,
  };
}

export async function loadAnnotations(pdfPath: string): Promise<AnnotationsSidecar> {
  const response = await invoke<BackendSidecar>("annotations_load", { pdfPath });
  return mapSidecar(response);
}

export async function addAnnotation(
  pdfPath: string,
  annotation: Annotation
): Promise<AnnotationsSidecar> {
  const response = await invoke<BackendSidecar>("annotation_add", {
    pdfPath,
    annotation: annotationToBackend(annotation),
  });
  return mapSidecar(response);
}

export async function updateAnnotation(
  pdfPath: string,
  annotation: Annotation
): Promise<AnnotationsSidecar> {
  const response = await invoke<BackendSidecar>("annotation_update", {
    pdfPath,
    annotation: annotationToBackend(annotation),
  });
  return mapSidecar(response);
}

export async function deleteAnnotation(
  pdfPath: string,
  annotationId: string
): Promise<AnnotationsSidecar> {
  const response = await invoke<BackendSidecar>("annotation_delete", {
    pdfPath,
    annotationId,
  });
  return mapSidecar(response);
}

export async function clearAnnotations(
  pdfPath: string
): Promise<AnnotationsSidecar> {
  const response = await invoke<BackendSidecar>("annotations_clear", { pdfPath });
  return mapSidecar(response);
}

// ====== Page editing ======

export async function rotatePages(
  inputPath: string,
  outputPath: string,
  pages: number[],
  degrees: number
): Promise<void> {
  await invoke("pages_rotate", { inputPath, outputPath, pages, degrees });
}

export async function extractPages(
  inputPath: string,
  outputPath: string,
  pages: number[]
): Promise<void> {
  await invoke("pages_extract", { inputPath, outputPath, pages });
}

export async function deletePages(
  inputPath: string,
  outputPath: string,
  pages: number[]
): Promise<void> {
  await invoke("pages_delete", { inputPath, outputPath, pages });
}

export async function mergePdfs(
  inputPaths: string[],
  outputPath: string
): Promise<void> {
  await invoke("pages_merge", { inputPaths, outputPath });
}

export async function reorderPages(
  inputPath: string,
  outputPath: string,
  newOrder: number[]
): Promise<void> {
  await invoke("pages_reorder", { inputPath, outputPath, newOrder });
}

export async function splitPdf(
  inputPath: string,
  outputDir: string,
  splits: number[]
): Promise<string[]> {
  return await invoke<string[]>("pages_split", { inputPath, outputDir, splits });
}

// ====== Version history ======

export async function saveVersion(pdfPath: string): Promise<string> {
  return await invoke<string>("version_save", { pdfPath });
}

export async function listVersions(pdfPath: string): Promise<string[]> {
  return await invoke<string[]>("version_list", { pdfPath });
}

export async function savePdfBackup(
  path: string,
  backupPath: string
): Promise<void> {
  await invoke("pdf_save_backup", { path, backupPath });
}

export async function printPdf(path: string): Promise<void> {
  await invoke("pdf_print", { path });
}

export async function embedAnnotationsIntoPdf(
  pdfPath: string,
  outputPath: string
): Promise<void> {
  await invoke("annotations_embed_into_pdf", { pdfPath, outputPath });
}

// ====== Transform ops ======

export async function duplicatePage(
  inputPath: string,
  outputPath: string,
  pageIndex: number
): Promise<void> {
  await invoke("pages_duplicate", { inputPath, outputPath, pageIndex });
}

export async function insertBlankPage(
  inputPath: string,
  outputPath: string,
  atIndex: number,
  widthPoints?: number,
  heightPoints?: number
): Promise<void> {
  await invoke("pages_insert_blank", {
    inputPath,
    outputPath,
    atIndex,
    widthPoints: widthPoints ?? null,
    heightPoints: heightPoints ?? null,
  });
}

export async function exportPageAsImage(
  inputPath: string,
  pageIndex: number,
  outputPath: string,
  dpi: number,
  format: "png" | "jpg"
): Promise<void> {
  await invoke("pdf_export_page_image", {
    inputPath,
    pageIndex,
    outputPath,
    dpi,
    format,
  });
}

export async function exportAllPagesAsImages(
  inputPath: string,
  outputDir: string,
  dpi: number,
  format: "png" | "jpg"
): Promise<string[]> {
  return await invoke<string[]>("pdf_export_all_images", {
    inputPath,
    outputDir,
    dpi,
    format,
  });
}

export async function pdfFromImages(
  imagePaths: string[],
  outputPath: string
): Promise<void> {
  await invoke("pdf_from_images", { imagePaths, outputPath });
}

export async function setPdfMetadata(
  inputPath: string,
  outputPath: string,
  fields: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
  }
): Promise<void> {
  await invoke("pdf_set_metadata", {
    inputPath,
    outputPath,
    title: fields.title ?? null,
    author: fields.author ?? null,
    subject: fields.subject ?? null,
    keywords: fields.keywords ?? null,
  });
}

export async function compressPdf(
  inputPath: string,
  outputPath: string
): Promise<{ before: number; after: number }> {
  const [before, after] = await invoke<[number, number]>("pdf_compress", {
    inputPath,
    outputPath,
  });
  return { before, after };
}

export async function watermarkPdf(
  inputPath: string,
  outputPath: string,
  text: string,
  fontSize: number,
  opacity: number
): Promise<void> {
  await invoke("pdf_watermark", {
    inputPath,
    outputPath,
    text,
    fontSize,
    opacity,
  });
}

export async function pageNumbersPdf(
  inputPath: string,
  outputPath: string,
  format: string,
  fontSize: number
): Promise<void> {
  await invoke("pdf_page_numbers", {
    inputPath,
    outputPath,
    format,
    fontSize,
  });
}

export async function rotateDocument(
  inputPath: string,
  outputPath: string,
  degrees: number
): Promise<void> {
  await invoke("pdf_rotate_document", { inputPath, outputPath, degrees });
}

export interface RedactRect {
  page: number;
  bottom: number;
  left: number;
  top: number;
  right: number;
}

export async function redactPdf(
  inputPath: string,
  outputPath: string,
  rects: RedactRect[]
): Promise<void> {
  await invoke("pdf_redact", { inputPath, outputPath, rects });
}

export async function cropPdfUniform(
  inputPath: string,
  outputPath: string,
  top: number,
  right: number,
  bottom: number,
  left: number
): Promise<void> {
  await invoke("pdf_crop_uniform", {
    inputPath,
    outputPath,
    top,
    right,
    bottom,
    left,
  });
}

export async function stampImage(
  inputPath: string,
  outputPath: string,
  pageIndex: number,
  imagePath: string,
  left: number,
  bottom: number,
  width: number,
  height: number
): Promise<void> {
  await invoke("pdf_stamp_image", {
    inputPath,
    outputPath,
    pageIndex,
    imagePath,
    left,
    bottom,
    width,
    height,
  });
}

export async function extractTextToFile(
  inputPath: string,
  outputPath: string
): Promise<void> {
  await invoke("pdf_extract_text_to_file", { inputPath, outputPath });
}

export type StampPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "center";

export interface PageDiff {
  page: number;
  only_in_a: string[];
  only_in_b: string[];
}

export async function askClaude(
  apiKey: string,
  prompt: string
): Promise<string> {
  return await invoke<string>("ai_ask_claude", { apiKey, prompt });
}

export async function readLocalApiKey(): Promise<string> {
  return await invoke<string>("ai_read_local_api_key");
}

export async function ocrPdf(
  inputPath: string,
  lang: string
): Promise<string> {
  return await invoke<string>("pdf_ocr", { inputPath, lang });
}

export async function listFormFields(
  inputPath: string
): Promise<[string, string | null][]> {
  return await invoke<[string, string | null][]>("pdf_list_form_fields", {
    inputPath,
  });
}

export async function comparePdfs(
  pathA: string,
  pathB: string
): Promise<PageDiff[]> {
  return await invoke<PageDiff[]>("pdf_compare", { pathA, pathB });
}

export interface BookmarkEdit {
  title: string;
  page: number;
}

export async function setBookmarks(
  inputPath: string,
  outputPath: string,
  bookmarks: BookmarkEdit[]
): Promise<void> {
  await invoke("pdf_set_bookmarks", { inputPath, outputPath, bookmarks });
}

export async function addFormattedText(params: {
  inputPath: string;
  outputPath: string;
  pageIndex: number;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: [number, number, number];
  ttfPath: string | null;
  familyFallback: "helvetica" | "times" | "courier";
  bold: boolean;
  italic: boolean;
}): Promise<void> {
  await invoke("pdf_add_formatted_text", {
    inputPath: params.inputPath,
    outputPath: params.outputPath,
    pageIndex: params.pageIndex,
    text: params.text,
    x: params.x,
    y: params.y,
    fontSize: params.fontSize,
    colorR: params.color[0],
    colorG: params.color[1],
    colorB: params.color[2],
    ttfPath: params.ttfPath,
    familyFallback: params.familyFallback,
    bold: params.bold,
    italic: params.italic,
  });
}

export async function listSystemFonts(): Promise<[string, string][]> {
  return await invoke<[string, string][]>("pdf_list_system_fonts");
}

export async function stampText(
  inputPath: string,
  outputPath: string,
  text: string,
  fontSize: number,
  color: [number, number, number],
  position: StampPosition,
  onlyPage?: number
): Promise<void> {
  await invoke("pdf_stamp_text", {
    inputPath,
    outputPath,
    text,
    fontSize,
    colorR: color[0],
    colorG: color[1],
    colorB: color[2],
    position,
    onlyPage: onlyPage ?? null,
  });
}

// ============================================================
// Security (Plan 2.0.A) - password protection y operaciones lossless
// ============================================================

/**
 * Permisos asignables a un PDF cifrado. Se aplican solo cuando se abre
 * con `userPassword`; el `ownerPassword` siempre tiene control total.
 */
export interface PdfPermissions {
  allowPrint?: boolean;
  allowExtract?: boolean;
  allowModify?: boolean;
  allowAnnotateAndForm?: boolean;
  allowFormFilling?: boolean;
  allowAssemble?: boolean;
  allowAccessibility?: boolean;
}

/**
 * Detecta si un PDF esta cifrado. No requiere password: si qpdf no
 * puede abrirlo sin password, devuelve true.
 */
export async function isPdfEncrypted(inputPath: string): Promise<boolean> {
  return await invoke<boolean>("pdf_is_encrypted", { inputPath });
}

/**
 * Cifra un PDF con AES-256 (R6). Escribe el resultado en `outputPath`,
 * sin modificar el archivo original.
 *
 * - `userPassword`: requerido para abrir el PDF.
 * - `ownerPassword`: requerido para cambiar permisos / quitar el cifrado.
 *   Si es vacio, qpdf lo trata igual que `userPassword`.
 */
export async function encryptPdf(
  inputPath: string,
  outputPath: string,
  userPassword: string,
  ownerPassword: string,
  permissions: PdfPermissions = {}
): Promise<void> {
  await invoke("pdf_encrypt", {
    inputPath,
    outputPath,
    userPassword,
    ownerPassword,
    allowPrint: permissions.allowPrint ?? true,
    allowExtract: permissions.allowExtract ?? false,
    allowModify: permissions.allowModify ?? false,
    allowAnnotateAndForm: permissions.allowAnnotateAndForm ?? false,
    allowFormFilling: permissions.allowFormFilling ?? false,
    allowAssemble: permissions.allowAssemble ?? false,
    allowAccessibility: permissions.allowAccessibility ?? true,
  });
}

/**
 * Quita el cifrado de un PDF protegido. Requiere conocer la contrasena
 * (preferentemente la de owner; user tambien funciona si tiene permisos).
 */
export async function decryptPdf(
  inputPath: string,
  outputPath: string,
  password: string
): Promise<void> {
  await invoke("pdf_decrypt", { inputPath, outputPath, password });
}

/**
 * Linealiza un PDF para "fast web view".
 */
export async function linearizePdf(
  inputPath: string,
  outputPath: string
): Promise<void> {
  await invoke("pdf_linearize", { inputPath, outputPath });
}

// ============================================================
// Sanitize PDF (Plan v0.4 - Stirling mapping #1)
// ============================================================

/**
 * Opciones para sanitizar un PDF. Cada `true` significa "remover esta
 * categoria del PDF". Defaults razonables si no se especifica:
 * todo activo salvo metadata.
 */
export interface SanitizeOptions {
  removeJavascript?: boolean;
  removeEmbeddedFiles?: boolean;
  removeOpenActions?: boolean;
  removeXfa?: boolean;
  removeMetadata?: boolean;
}

/**
 * Reporte devuelto por `sanitizePdf` indicando que se removio realmente.
 * Util para mostrar un resumen al usuario.
 *
 * Las claves vienen del backend Rust con snake_case via serde.
 */
export interface SanitizeReport {
  javascript_removed: boolean;
  embedded_files_removed: boolean;
  open_action_removed: boolean;
  catalog_aa_removed: boolean;
  pages_actions_removed: number;
  xfa_removed: boolean;
  metadata_removed: boolean;
}

/**
 * Sanitiza un PDF removiendo elementos peligrosos / intrusivos.
 * Crea una copia limpia en `outputPath`; el archivo original no se modifica.
 */
export async function sanitizePdf(
  inputPath: string,
  outputPath: string,
  options: SanitizeOptions = {}
): Promise<SanitizeReport> {
  return await invoke<SanitizeReport>("pdf_sanitize", {
    inputPath,
    outputPath,
    removeJavascript: options.removeJavascript ?? null,
    removeEmbeddedFiles: options.removeEmbeddedFiles ?? null,
    removeOpenActions: options.removeOpenActions ?? null,
    removeXfa: options.removeXfa ?? null,
    removeMetadata: options.removeMetadata ?? null,
  });
}

// ============================================================
// Auto-redact via regex (Stirling mapping #2)
// ============================================================

export interface AutoRedactOptions {
  useDni?: boolean;
  useTelefono?: boolean;
  useEmail?: boolean;
  /** Lista de [label, regex] adicionales aportados por el usuario. */
  customPatterns?: Array<[string, string]>;
}

export interface PatternHits {
  label: string;
  matches: number;
  pages_with_hits: number[];
}

export interface AutoRedactReport {
  total_redactions: number;
  per_pattern: PatternHits[];
}

/**
 * Aplica redacciones automaticas en `outputPath` segun patrones regex
 * (presets DNI/telefono/email + custom). El original no se modifica.
 */
export async function autoRedactPdf(
  inputPath: string,
  outputPath: string,
  options: AutoRedactOptions = {}
): Promise<AutoRedactReport> {
  return await invoke<AutoRedactReport>("pdf_auto_redact", {
    inputPath,
    outputPath,
    useDni: options.useDni ?? false,
    useTelefono: options.useTelefono ?? false,
    useEmail: options.useEmail ?? false,
    customPatterns: options.customPatterns ?? [],
  });
}

/**
 * Solo escanea: devuelve cuantos matches habria por patron sin modificar
 * ni guardar nada. Util como preview "esto vas a tachar".
 */
export async function autoRedactPdfPreview(
  inputPath: string,
  options: AutoRedactOptions = {}
): Promise<AutoRedactReport> {
  return await invoke<AutoRedactReport>("pdf_auto_redact_preview", {
    inputPath,
    useDni: options.useDni ?? false,
    useTelefono: options.useTelefono ?? false,
    useEmail: options.useEmail ?? false,
    customPatterns: options.customPatterns ?? [],
  });
}

// ============================================================
// Blank page detection (Stirling mapping #3)
// ============================================================

export interface BlankDetectOptions {
  /** Limite de chars no-whitespace para considerar pagina sin texto. Default 3. */
  maxTextChars?: number;
  /** Tamano minimo en pt para considerar imagen significativa. Default 20. */
  minImageSizePt?: number;
}

export interface BlankDetectionReport {
  total_pages: number;
  /** Indices 0-based de paginas detectadas como en blanco. */
  blank_pages: number[];
}

/**
 * Solo escanea: devuelve indices de paginas detectadas como en blanco.
 * No modifica el archivo.
 */
export async function detectBlankPages(
  inputPath: string,
  options: BlankDetectOptions = {}
): Promise<BlankDetectionReport> {
  return await invoke<BlankDetectionReport>("pdf_detect_blank_pages", {
    inputPath,
    maxTextChars: options.maxTextChars ?? null,
    minImageSizePt: options.minImageSizePt ?? null,
  });
}

/**
 * Detecta y elimina las paginas blank, escribe el resultado en outputPath.
 * El archivo original no se modifica.
 */
export async function deleteBlankPages(
  inputPath: string,
  outputPath: string,
  options: BlankDetectOptions = {}
): Promise<BlankDetectionReport> {
  return await invoke<BlankDetectionReport>("pdf_delete_blank_pages", {
    inputPath,
    outputPath,
    maxTextChars: options.maxTextChars ?? null,
    minImageSizePt: options.minImageSizePt ?? null,
  });
}
