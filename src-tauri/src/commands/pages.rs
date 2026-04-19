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

#[tauri::command]
pub async fn pages_merge(
    input_paths: Vec<String>,
    output_path: String,
) -> Result<(), String> {
    let inputs: Vec<PathBuf> = input_paths.into_iter().map(PathBuf::from).collect();
    editor::merge_pdfs(&inputs, &PathBuf::from(output_path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pages_reorder(
    input_path: String,
    output_path: String,
    new_order: Vec<u16>,
) -> Result<(), String> {
    editor::reorder_pages(
        &PathBuf::from(input_path),
        &PathBuf::from(output_path),
        &new_order,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pages_split(
    input_path: String,
    output_dir: String,
    splits: Vec<u16>,
) -> Result<Vec<String>, String> {
    let outputs = editor::split_pdf_at_pages(
        &PathBuf::from(input_path),
        &PathBuf::from(output_dir),
        &splits,
    )
    .map_err(|e| e.to_string())?;
    Ok(outputs
        .into_iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect())
}
