// Comando Tauri para auto-redact via regex (Stirling mapping #2).
//
// Detecta DNI peruano, telefonos, emails y patrones custom; tacha cada
// match con un rectangulo negro opaco.

use crate::pdf::auto_redact::{self, AutoRedactReport};
use std::path::PathBuf;

#[tauri::command]
pub async fn pdf_auto_redact(
    input_path: String,
    output_path: String,
    use_dni: bool,
    use_telefono: bool,
    use_email: bool,
    custom_patterns: Vec<(String, String)>,
) -> Result<AutoRedactReport, String> {
    let patterns = auto_redact::build_patterns(
        use_dni,
        use_telefono,
        use_email,
        &custom_patterns,
    )
    .map_err(|e| e.to_string())?;

    auto_redact::auto_redact(
        &PathBuf::from(input_path),
        &PathBuf::from(output_path),
        &patterns,
    )
    .map_err(|e| e.to_string())
}

/// Variante sin guardar: solo escanea y devuelve cuantos matches habria
/// por patron. Util para preview "cuantos vas a tachar antes de aplicar".
#[tauri::command]
pub async fn pdf_auto_redact_preview(
    input_path: String,
    use_dni: bool,
    use_telefono: bool,
    use_email: bool,
    custom_patterns: Vec<(String, String)>,
) -> Result<AutoRedactReport, String> {
    let patterns = auto_redact::build_patterns(
        use_dni,
        use_telefono,
        use_email,
        &custom_patterns,
    )
    .map_err(|e| e.to_string())?;

    let (_rects, report) = auto_redact::scan_for_redactions(
        &PathBuf::from(input_path),
        &patterns,
    )
    .map_err(|e| e.to_string())?;

    Ok(report)
}
