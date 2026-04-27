import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks de tauri y plugin-dialog antes de importar el modulo bajo prueba
vi.mock("@/lib/tauri", () => ({
  openPdf: vi.fn(),
  isPdfEncrypted: vi.fn(),
  decryptPdf: vi.fn(),
  addRecentFile: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(),
}));

import { openPdfFlow, openPdfWithPasswordPrompt } from "@/lib/openPdfFlow";
import * as tauri from "@/lib/tauri";
import * as dialog from "@tauri-apps/plugin-dialog";
import type { PdfDocument } from "@/types/pdf";

const sampleDoc: PdfDocument = {
  id: "d1",
  path: "C:/x.pdf",
  pageCount: 1,
  title: null,
  author: null,
  isModified: false,
};

describe("openPdfFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // alert/prompt no existen en jsdom por defecto cuando se usan asi:
    // vi.stubGlobal asegura que existan y sean spy-eables.
    vi.stubGlobal("alert", vi.fn());
    vi.stubGlobal("prompt", vi.fn());
  });

  it("PDF no cifrado se abre directo y se agrega a recientes", async () => {
    vi.mocked(tauri.isPdfEncrypted).mockResolvedValue(false);
    vi.mocked(tauri.openPdf).mockResolvedValue(sampleDoc);

    const doc = await openPdfFlow("C:/plain.pdf");

    expect(doc).toEqual(sampleDoc);
    expect(tauri.decryptPdf).not.toHaveBeenCalled();
    expect(tauri.addRecentFile).toHaveBeenCalledWith("C:/plain.pdf");
  });

  it("PDF cifrado y usuario cancela el prompt: no se abre nada", async () => {
    vi.mocked(tauri.isPdfEncrypted).mockResolvedValue(true);
    vi.mocked(window.prompt).mockReturnValue(null);

    const r = await openPdfWithPasswordPrompt("C:/enc.pdf");

    expect(r.canceled).toBe(true);
    expect(r.doc).toBeNull();
    expect(tauri.decryptPdf).not.toHaveBeenCalled();
    expect(tauri.openPdf).not.toHaveBeenCalled();
  });

  it("PDF cifrado, usuario da password y elige ruta: descifra y abre", async () => {
    vi.mocked(tauri.isPdfEncrypted).mockResolvedValue(true);
    vi.mocked(window.prompt).mockReturnValue("secreto");
    vi.mocked(dialog.save).mockResolvedValue("C:/enc-desprotegido.pdf");
    vi.mocked(tauri.decryptPdf).mockResolvedValue(undefined);
    vi.mocked(tauri.openPdf).mockResolvedValue(sampleDoc);

    const doc = await openPdfFlow("C:/enc.pdf");

    expect(tauri.decryptPdf).toHaveBeenCalledWith(
      "C:/enc.pdf",
      "C:/enc-desprotegido.pdf",
      "secreto"
    );
    expect(tauri.openPdf).toHaveBeenCalledWith("C:/enc-desprotegido.pdf");
    expect(doc).toEqual(sampleDoc);
    // Recientes debe registrar la ruta abierta (descifrada), no la original
    expect(tauri.addRecentFile).toHaveBeenCalledWith("C:/enc-desprotegido.pdf");
  });

  it("PDF cifrado con password incorrecto reporta error sin abrir", async () => {
    vi.mocked(tauri.isPdfEncrypted).mockResolvedValue(true);
    vi.mocked(window.prompt).mockReturnValue("malpassword");
    vi.mocked(dialog.save).mockResolvedValue("C:/out.pdf");
    vi.mocked(tauri.decryptPdf).mockRejectedValue(new Error("invalid password"));

    const r = await openPdfWithPasswordPrompt("C:/enc.pdf");

    expect(r.canceled).toBe(false);
    expect(r.doc).toBeNull();
    expect(r.error).toContain("descifrar");
    expect(tauri.openPdf).not.toHaveBeenCalled();
  });

  it("Si isPdfEncrypted falla, se intenta abrir igual y propaga el error de openPdf", async () => {
    vi.mocked(tauri.isPdfEncrypted).mockRejectedValue(new Error("io"));
    vi.mocked(tauri.openPdf).mockRejectedValue(new Error("corrupt"));

    const r = await openPdfWithPasswordPrompt("C:/bad.pdf");

    expect(r.error).toContain("corrupt");
    expect(r.canceled).toBe(false);
  });
});
