// PDF document commands exposed to frontend via Tauri invoke()
use crate::pdf::{document, extractor, renderer};
use serde::Serialize;
use std::path::PathBuf;

#[derive(Debug, Serialize)]
pub struct PdfOpenResponse {
    pub info: document::DocumentInfo,
}

#[tauri::command]
pub async fn pdf_open(path: String) -> Result<PdfOpenResponse, String> {
    let path = PathBuf::from(&path);
    let info = document::load_document_info(&path).map_err(|e| e.to_string())?;
    Ok(PdfOpenResponse { info })
}

#[tauri::command]
pub async fn pdf_render_page(
    path: String,
    page_index: u16,
    scale: f32,
) -> Result<Vec<u8>, String> {
    let path = PathBuf::from(&path);
    renderer::render_page_to_png(&path, page_index, scale).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_extract_text(path: String, page_index: u16) -> Result<String, String> {
    let path = PathBuf::from(&path);
    extractor::extract_page_text(&path, page_index).map_err(|e| e.to_string())
}

/// Detecta la fuente y tamano dominantes en una pagina del PDF.
/// Devuelve None si la pagina no tiene texto (e.g., escaneo sin OCR).
#[tauri::command]
pub async fn pdf_detect_dominant_font(
    path: String,
    page_index: u16,
) -> Result<Option<extractor::DominantFont>, String> {
    let path = PathBuf::from(&path);
    extractor::detect_dominant_font(&path, page_index).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_get_bookmarks(
    path: String,
) -> Result<Vec<extractor::BookmarkNode>, String> {
    let path = PathBuf::from(&path);
    extractor::extract_bookmarks(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_get_pages_info(path: String) -> Result<Vec<document::PageInfo>, String> {
    let path = PathBuf::from(&path);
    document::get_pages_info(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_save_backup(path: String, backup_path: String) -> Result<(), String> {
    std::fs::copy(&path, &backup_path).map_err(|e| e.to_string())?;
    Ok(())
}

/// Launch Windows "print" verb via ShellExecute on the given PDF.
/// Si el visor predeterminado de PDFs no muestra dialog de impresoras
/// reales (caso comun con Edge configurado para "Microsoft Print to PDF"),
/// usa pdf_print_to despues de elegir una impresora con list_system_printers.
#[tauri::command]
pub async fn pdf_print(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        let ps = format!(
            "Start-Process -FilePath '{}' -Verb Print",
            path.replace('\'', "''")
        );
        Command::new("powershell")
            .creation_flags(0x0800_0000)
            .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &ps])
            .spawn()
            .map_err(|e| format!("Print failed: {}", e))?;
        return Ok(());
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = path;
        Err("Print only supported on Windows".to_string())
    }
}

/// Lista las impresoras instaladas en el sistema (Windows).
#[tauri::command]
pub async fn list_system_printers() -> Result<Vec<String>, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        let output = Command::new("powershell")
            .creation_flags(0x0800_0000)
            .args([
                "-NoProfile",
                "-Command",
                "Get-Printer | Select-Object -ExpandProperty Name",
            ])
            .output()
            .map_err(|e| format!("No se pudo listar impresoras: {}", e))?;

        if !output.status.success() {
            // Fallback con WMI para sistemas viejos
            let alt = Command::new("powershell")
                .creation_flags(0x0800_0000)
                .args([
                    "-NoProfile",
                    "-Command",
                    "Get-WmiObject -Class Win32_Printer | Select-Object -ExpandProperty Name",
                ])
                .output()
                .map_err(|e| format!("No se pudo listar impresoras (WMI): {}", e))?;
            if !alt.status.success() {
                return Err(String::from_utf8_lossy(&alt.stderr).to_string());
            }
            return Ok(parse_printer_lines(&alt.stdout));
        }

        Ok(parse_printer_lines(&output.stdout))
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Listar impresoras solo soportado en Windows".to_string())
    }
}

#[cfg(target_os = "windows")]
fn parse_printer_lines(stdout: &[u8]) -> Vec<String> {
    String::from_utf8_lossy(stdout)
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

/// Imprime un PDF a una impresora especifica usando Start-Process -Verb PrintTo.
/// El visor predeterminado abre brevemente y envia el archivo a la impresora,
/// luego se cierra. NO muestra dialog: la impresora ya fue elegida.
#[tauri::command]
pub async fn pdf_print_to(path: String, printer_name: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        let ps = format!(
            "Start-Process -FilePath '{}' -Verb PrintTo -ArgumentList '\"{}\"'",
            path.replace('\'', "''"),
            printer_name.replace('\'', "''").replace('"', "")
        );
        Command::new("powershell")
            .creation_flags(0x0800_0000)
            .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &ps])
            .spawn()
            .map_err(|e| format!("PrintTo failed: {}", e))?;
        return Ok(());
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (path, printer_name);
        Err("PrintTo solo soportado en Windows".to_string())
    }
}
