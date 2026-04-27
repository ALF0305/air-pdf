// Comandos Tauri para deteccion / borrado de paginas en blanco
// (Stirling mapping #3, util para escaneos clinicos duplex).

use crate::pdf::blank_pages::{self, BlankDetectOptions, BlankDetectionReport};
use std::path::PathBuf;

fn build_options(
    max_text_chars: Option<u32>,
    min_image_size_pt: Option<f32>,
) -> BlankDetectOptions {
    let defaults = BlankDetectOptions::default();
    BlankDetectOptions {
        max_text_chars: max_text_chars
            .map(|v| v as usize)
            .unwrap_or(defaults.max_text_chars),
        min_image_size_pt: min_image_size_pt.unwrap_or(defaults.min_image_size_pt),
    }
}

#[tauri::command]
pub async fn pdf_detect_blank_pages(
    input_path: String,
    max_text_chars: Option<u32>,
    min_image_size_pt: Option<f32>,
) -> Result<BlankDetectionReport, String> {
    let options = build_options(max_text_chars, min_image_size_pt);
    blank_pages::detect_blank_pages(&PathBuf::from(input_path), &options)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_delete_blank_pages(
    input_path: String,
    output_path: String,
    max_text_chars: Option<u32>,
    min_image_size_pt: Option<f32>,
) -> Result<BlankDetectionReport, String> {
    let options = build_options(max_text_chars, min_image_size_pt);
    blank_pages::delete_blank_pages(
        &PathBuf::from(input_path),
        &PathBuf::from(output_path),
        &options,
    )
    .map_err(|e| e.to_string())
}
