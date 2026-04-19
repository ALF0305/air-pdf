export type AnnotationType =
  | "highlight"
  | "underline"
  | "strikethrough"
  | "note"
  | "drawing"
  | "stamp"
  | "rect"
  | "circle"
  | "arrow";

export interface Annotation {
  id: string;
  type: AnnotationType;
  page: number;
  rect: [number, number, number, number];
  color: string;
  category?: string;
  text?: string;
  note?: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  data?: unknown;
}

export interface AnnotationsSidecar {
  version: string;
  pdfHash: string;
  createdAt: string;
  updatedAt: string;
  annotations: Annotation[];
  bookmarksCustom: unknown[];
  metadata: {
    tags: string[];
    linkedObsidianNote?: string;
  };
}
