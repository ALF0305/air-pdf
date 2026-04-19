export interface PdfDocument {
  id: string;
  path: string;
  pageCount: number;
  title: string | null;
  author: string | null;
  isModified: boolean;
}

export interface PdfPage {
  pageNumber: number;
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
}

export interface Bookmark {
  title: string;
  page: number;
  children: Bookmark[];
}

export interface SearchResult {
  page: number;
  rect: [number, number, number, number];
  context: string;
}
