// Text search command
use crate::pdf::extractor::{search_text, SearchMatch};
use std::path::PathBuf;

#[tauri::command]
pub async fn pdf_search(
    path: String,
    query: String,
    case_sensitive: bool,
) -> Result<Vec<SearchMatch>, String> {
    let path = PathBuf::from(&path);
    search_text(&path, &query, case_sensitive).map_err(|e| e.to_string())
}
