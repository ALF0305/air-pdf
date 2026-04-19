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
