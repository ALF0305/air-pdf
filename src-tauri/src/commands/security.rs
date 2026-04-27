// Commands for PDF security (Plan 2.0.A).
//
// Cubre password protection, descifrado y linealizacion via crate `qpdf`.
// El frontend invoca estos comandos desde dialogos en el menu Archivo.

use crate::pdf::security::{self, PdfPermissions};
use std::path::PathBuf;

/// Devuelve `true` si el PDF esta cifrado (requiere o no password para abrir).
#[tauri::command]
pub async fn pdf_is_encrypted(input_path: String) -> Result<bool, String> {
    security::is_pdf_encrypted(PathBuf::from(input_path)).map_err(|e| e.to_string())
}

/// Cifra un PDF con AES-256.
///
/// `permissions` es un objeto plano para serializar facil desde TS.
/// Cualquier campo ausente se interpreta como `false`.
#[tauri::command]
pub async fn pdf_encrypt(
    input_path: String,
    output_path: String,
    user_password: String,
    owner_password: String,
    allow_print: Option<bool>,
    allow_extract: Option<bool>,
    allow_modify: Option<bool>,
    allow_annotate_and_form: Option<bool>,
    allow_form_filling: Option<bool>,
    allow_assemble: Option<bool>,
    allow_accessibility: Option<bool>,
) -> Result<(), String> {
    let permissions = PdfPermissions {
        allow_print: allow_print.unwrap_or(true),
        allow_extract: allow_extract.unwrap_or(false),
        allow_modify: allow_modify.unwrap_or(false),
        allow_annotate_and_form: allow_annotate_and_form.unwrap_or(false),
        allow_form_filling: allow_form_filling.unwrap_or(false),
        allow_assemble: allow_assemble.unwrap_or(false),
        allow_accessibility: allow_accessibility.unwrap_or(true),
    };

    security::encrypt_pdf(
        PathBuf::from(input_path),
        PathBuf::from(output_path),
        &user_password,
        &owner_password,
        permissions,
    )
    .map_err(|e| e.to_string())
}

/// Quita el cifrado de un PDF protegido. Requiere conocer la contrasena.
#[tauri::command]
pub async fn pdf_decrypt(
    input_path: String,
    output_path: String,
    password: String,
) -> Result<(), String> {
    security::decrypt_pdf(
        PathBuf::from(input_path),
        PathBuf::from(output_path),
        &password,
    )
    .map_err(|e| e.to_string())
}

/// Linealiza un PDF para "fast web view" (web optimization).
#[tauri::command]
pub async fn pdf_linearize(
    input_path: String,
    output_path: String,
) -> Result<(), String> {
    security::linearize_pdf(
        PathBuf::from(input_path),
        PathBuf::from(output_path),
    )
    .map_err(|e| e.to_string())
}
