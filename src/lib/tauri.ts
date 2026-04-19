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

export async function embedAnnotationsIntoPdf(
  pdfPath: string,
  outputPath: string
): Promise<void> {
  await invoke("annotations_embed_into_pdf", { pdfPath, outputPath });
}
