pub mod error;
pub mod commands;
pub mod pdf;
pub mod storage;
pub mod integrations;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize PDFium at startup. If this fails, the app still runs but
    // PDF operations will return errors.
    if let Err(e) = pdf::engine::init() {
        eprintln!("Warning: PDFium failed to initialize: {}", e);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::pdf::pdf_open,
            commands::pdf::pdf_render_page,
            commands::pdf::pdf_extract_text,
            commands::pdf::pdf_get_bookmarks,
            commands::pdf::pdf_get_pages_info,
            commands::pdf::pdf_save_backup,
            commands::search::pdf_search,
            commands::settings::settings_load,
            commands::settings::settings_save,
            commands::settings::recent_list,
            commands::settings::recent_add,
            commands::settings::recent_clear,
            commands::settings::detect_ai_mode,
            commands::annotations::annotations_load,
            commands::annotations::annotations_save,
            commands::annotations::annotation_add,
            commands::annotations::annotation_update,
            commands::annotations::annotation_delete,
            commands::annotations::annotations_clear,
            commands::annotations::annotations_embed_into_pdf,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        assert_eq!(add(2, 3), 5);
    }

    #[test]
    fn test_add_negative() {
        assert_eq!(add(-1, 1), 0);
    }

    #[test]
    fn test_greet_includes_name() {
        assert!(greet("Alfredo").contains("Alfredo"));
    }
}
