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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::pdf::pdf_open,
            commands::pdf::pdf_render_page,
            commands::pdf::pdf_extract_text,
            commands::pdf::pdf_get_bookmarks,
            commands::pdf::pdf_get_pages_info,
            commands::pdf::pdf_save_backup,
            commands::pdf::pdf_print,
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
            commands::pages::pages_rotate,
            commands::pages::pages_extract,
            commands::pages::pages_delete,
            commands::pages::version_save,
            commands::pages::version_list,
            commands::pages::pages_merge,
            commands::pages::pages_reorder,
            commands::pages::pages_split,
            commands::transform::pages_duplicate,
            commands::transform::pages_insert_blank,
            commands::transform::pdf_export_page_image,
            commands::transform::pdf_export_all_images,
            commands::transform::pdf_from_images,
            commands::transform::pdf_set_metadata,
            commands::transform::pdf_compress,
            commands::transform::pdf_watermark,
            commands::transform::pdf_page_numbers,
            commands::transform::pdf_rotate_document,
            commands::transform::pdf_redact,
            commands::transform::pdf_crop_uniform,
            commands::transform::pdf_stamp_image,
            commands::transform::pdf_extract_text_to_file,
            commands::transform::pdf_stamp_text,
            commands::transform::pdf_set_bookmarks,
            commands::transform::pdf_compare,
            commands::transform::pdf_list_form_fields,
            commands::transform::pdf_ocr,
            commands::transform::pdf_add_formatted_text,
            commands::transform::pdf_list_system_fonts,
            commands::ai::ai_ask_claude,
            commands::ai::ai_read_local_api_key,
            commands::security::pdf_is_encrypted,
            commands::security::pdf_encrypt,
            commands::security::pdf_decrypt,
            commands::security::pdf_linearize,
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
