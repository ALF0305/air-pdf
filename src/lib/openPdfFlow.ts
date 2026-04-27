// Helper centralizado para abrir un PDF con manejo de cifrado.
//
// Si el PDF esta cifrado, pide la contrasena al usuario (window.prompt
// por simplicidad, se puede mejorar a dialog react en una siguiente
// iteracion) y descifra a una ubicacion elegida por el usuario antes de
// abrir.
//
// Notas:
// - El archivo original cifrado NO se modifica.
// - El archivo abierto es el descifrado, NO el original. Los edits van al
//   descifrado. Esto es intencional para evitar confundir al usuario.
// - Si el usuario cancela el prompt o el saveDialog, no se abre nada.

import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { openPdf, isPdfEncrypted, decryptPdf, addRecentFile } from "@/lib/tauri";
import type { PdfDocument } from "@/types/pdf";

export interface OpenPdfFlowResult {
  doc: PdfDocument | null;
  /** ruta efectivamente abierta (descifrada si aplico) */
  openedPath: string | null;
  /** mensaje de error legible si fallo */
  error: string | null;
  /** true si el usuario cancelo (prompt o save dialog) */
  canceled: boolean;
}

/**
 * Intenta abrir un PDF, manejando cifrado de forma transparente.
 * No agrega a recientes automaticamente; el caller lo decide.
 *
 * Retorna un objeto con `doc` (si exito), `openedPath` (la ruta real
 * abierta, descifrada si aplico), `error` (mensaje si fallo) y `canceled`
 * (si el usuario abandono el flujo).
 */
export async function openPdfWithPasswordPrompt(
  path: string
): Promise<OpenPdfFlowResult> {
  let encrypted = false;
  try {
    encrypted = await isPdfEncrypted(path);
  } catch (e) {
    // Si la deteccion falla por si misma, intentamos abrir directo y
    // dejamos que openPdf reporte el error real.
    encrypted = false;
  }

  if (!encrypted) {
    try {
      const doc = await openPdf(path);
      return { doc, openedPath: path, error: null, canceled: false };
    } catch (e) {
      return {
        doc: null,
        openedPath: null,
        error: String(e),
        canceled: false,
      };
    }
  }

  // PDF cifrado: pedir password
  const password = window.prompt(
    `El PDF esta protegido con contrasena.\n\n${path}\n\nIngresa la contrasena para abrirlo:`
  );
  if (password === null || password === "") {
    return { doc: null, openedPath: null, error: null, canceled: true };
  }

  // Pedir a donde guardar la copia descifrada
  const decryptedPath = await saveDialog({
    title: "Guardar copia desprotegida",
    defaultPath: path.replace(/\.pdf$/i, "-desprotegido.pdf"),
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (!decryptedPath) {
    return { doc: null, openedPath: null, error: null, canceled: true };
  }

  // Descifrar
  try {
    await decryptPdf(path, decryptedPath, password);
  } catch (e) {
    return {
      doc: null,
      openedPath: null,
      error: `No se pudo descifrar: ${e}. Verifica la contrasena.`,
      canceled: false,
    };
  }

  // Abrir el descifrado
  try {
    const doc = await openPdf(decryptedPath);
    return { doc, openedPath: decryptedPath, error: null, canceled: false };
  } catch (e) {
    return {
      doc: null,
      openedPath: decryptedPath,
      error: `Descifrado OK pero no se pudo abrir: ${e}`,
      canceled: false,
    };
  }
}

/**
 * Variante que ademas agrega a recientes y muestra alert en caso de error.
 * Usada por los entry points tipicos (menu Archivo, drag-and-drop).
 */
export async function openPdfFlow(path: string): Promise<PdfDocument | null> {
  const r = await openPdfWithPasswordPrompt(path);
  if (r.canceled) return null;
  if (r.error) {
    alert(`Error abriendo PDF: ${r.error}`);
    return null;
  }
  if (r.doc && r.openedPath) {
    try {
      await addRecentFile(r.openedPath);
    } catch {
      // No es critico si recientes falla
    }
  }
  return r.doc;
}
