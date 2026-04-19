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
