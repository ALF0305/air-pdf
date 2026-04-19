import { describe, it, expect, beforeEach } from "vitest";
import { usePdfStore } from "@/stores/pdfStore";
import type { PdfDocument } from "@/types/pdf";

const sampleDoc: PdfDocument = {
  id: "doc-1",
  path: "C:/test.pdf",
  pageCount: 10,
  title: "Test",
  author: null,
  isModified: false,
};

describe("pdfStore", () => {
  beforeEach(() => {
    usePdfStore.setState({
      openTabs: [],
      activeTabId: null,
      currentPage: 0,
      zoom: 1.0,
      viewMode: "single",
    });
  });

  it("starts with no tabs", () => {
    expect(usePdfStore.getState().openTabs).toEqual([]);
    expect(usePdfStore.getState().activeTabId).toBeNull();
  });

  it("addTab agrega y activa el tab", () => {
    usePdfStore.getState().addTab(sampleDoc);
    expect(usePdfStore.getState().openTabs).toHaveLength(1);
    expect(usePdfStore.getState().activeTabId).toBe("doc-1");
  });

  it("addTab no duplica si el path ya esta abierto", () => {
    usePdfStore.getState().addTab(sampleDoc);
    usePdfStore.getState().addTab({ ...sampleDoc, id: "doc-2" });
    expect(usePdfStore.getState().openTabs).toHaveLength(1);
    expect(usePdfStore.getState().activeTabId).toBe("doc-1");
  });

  it("closeTab quita el tab y activa otro", () => {
    usePdfStore.getState().addTab(sampleDoc);
    usePdfStore.getState().addTab({
      ...sampleDoc,
      id: "doc-2",
      path: "C:/other.pdf",
    });
    usePdfStore.getState().closeTab("doc-1");
    expect(usePdfStore.getState().openTabs).toHaveLength(1);
    expect(usePdfStore.getState().activeTabId).toBe("doc-2");
  });

  it("setZoom cambia zoom", () => {
    usePdfStore.getState().setZoom(2.5);
    expect(usePdfStore.getState().zoom).toBe(2.5);
    usePdfStore.getState().setZoom("fit-width");
    expect(usePdfStore.getState().zoom).toBe("fit-width");
  });
});
