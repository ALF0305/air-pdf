// Settings + Recent files + AI mode detection commands
use crate::integrations::claude_code::{detect_mode, ClaudeMode};
use crate::storage::recent::{self, RecentList};
use crate::storage::settings::{self, Settings};

#[tauri::command]
pub async fn settings_load() -> Result<Settings, String> {
    settings::load().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn settings_save(settings: Settings) -> Result<(), String> {
    settings::save(&settings).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn recent_list() -> Result<RecentList, String> {
    recent::load().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn recent_add(path: String) -> Result<(), String> {
    recent::add(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn recent_clear() -> Result<(), String> {
    recent::clear().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn detect_ai_mode() -> ClaudeMode {
    detect_mode()
}
