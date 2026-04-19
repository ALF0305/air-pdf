// Page operations: rotate, extract, delete (via lopdf)
use crate::pdf::editor;
use std::path::PathBuf;

#[tauri::command]
pub async fn pages_rotate(
    input_path: String,
    output_path: String,
    pages: Vec<u16>,
    degrees: i32,
) -> Result<(), String> {
    editor::rotate_pages(
        &PathBuf::from(input_path),
        &PathBuf::from(output_path),
        &pages,
        degrees,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pages_extract(
    input_path: String,
    output_path: String,
    pages: Vec<u16>,
) -> Result<(), String> {
    editor::extract_pages(
        &PathBuf::from(input_path),
        &PathBuf::from(output_path),
        &pages,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pages_delete(
    input_path: String,
    output_path: String,
    pages: Vec<u16>,
) -> Result<(), String> {
    editor::delete_pages(
        &PathBuf::from(input_path),
        &PathBuf::from(output_path),
        &pages,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn version_save(pdf_path: String) -> Result<String, String> {
    let path = PathBuf::from(pdf_path);
    let saved = crate::storage::version_history::save_version(&path)
        .map_err(|e| e.to_string())?;
    Ok(saved.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn version_list(pdf_path: String) -> Result<Vec<String>, String> {
    let path = PathBuf::from(pdf_path);
    let versions = crate::storage::version_history::list_versions(&path)
        .map_err(|e| e.to_string())?;
    Ok(versions
        .into_iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect())
}
