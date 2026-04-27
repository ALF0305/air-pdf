// Comando Tauri para sanitizar un PDF (Plan v0.4 - Stirling mapping #1).
//
// Quita scripts, archivos embebidos, acciones automaticas, formularios XFA
// y opcionalmente metadata XMP. Devuelve un reporte de lo eliminado.

use crate::pdf::sanitize::{self, SanitizeOptions, SanitizeReport};
use std::path::PathBuf;

#[tauri::command]
pub async fn pdf_sanitize(
    input_path: String,
    output_path: String,
    remove_javascript: Option<bool>,
    remove_embedded_files: Option<bool>,
    remove_open_actions: Option<bool>,
    remove_xfa: Option<bool>,
    remove_metadata: Option<bool>,
) -> Result<SanitizeReport, String> {
    let defaults = SanitizeOptions::default();
    let options = SanitizeOptions {
        remove_javascript: remove_javascript.unwrap_or(defaults.remove_javascript),
        remove_embedded_files: remove_embedded_files
            .unwrap_or(defaults.remove_embedded_files),
        remove_open_actions: remove_open_actions.unwrap_or(defaults.remove_open_actions),
        remove_xfa: remove_xfa.unwrap_or(defaults.remove_xfa),
        remove_metadata: remove_metadata.unwrap_or(defaults.remove_metadata),
    };

    sanitize::sanitize_pdf(
        PathBuf::from(input_path),
        PathBuf::from(output_path),
        options,
    )
    .map_err(|e| e.to_string())
}
