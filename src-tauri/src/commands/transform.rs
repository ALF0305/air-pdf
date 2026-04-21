// Commands for page transformations.
use crate::pdf::transform::{self, ImageFmt, PdfMetadataEdit};
use std::path::PathBuf;

#[tauri::command]
pub async fn pages_duplicate(
    input_path: String,
    output_path: String,
    page_index: u16,
) -> Result<(), String> {
    transform::duplicate_page(
        &PathBuf::from(input_path),
        &PathBuf::from(output_path),
        page_index,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pages_insert_blank(
    input_path: String,
    output_path: String,
    at_index: u16,
    width_points: Option<f32>,
    height_points: Option<f32>,
) -> Result<(), String> {
    transform::insert_blank_page(
        &PathBuf::from(input_path),
        &PathBuf::from(output_path),
        at_index,
        width_points,
        height_points,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_export_page_image(
    input_path: String,
    page_index: u16,
    output_path: String,
    dpi: f32,
    format: String, // "png" | "jpg"
) -> Result<(), String> {
    let fmt = match format.to_lowercase().as_str() {
        "jpg" | "jpeg" => ImageFmt::Jpeg,
        _ => ImageFmt::Png,
    };
    transform::export_page_as_image(
        &PathBuf::from(input_path),
        page_index,
        &PathBuf::from(output_path),
        dpi,
        fmt,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_export_all_images(
    input_path: String,
    output_dir: String,
    dpi: f32,
    format: String,
) -> Result<Vec<String>, String> {
    let fmt = match format.to_lowercase().as_str() {
        "jpg" | "jpeg" => ImageFmt::Jpeg,
        _ => ImageFmt::Png,
    };
    let outs = transform::export_all_pages_as_images(
        &PathBuf::from(input_path),
        &PathBuf::from(output_dir),
        dpi,
        fmt,
    )
    .map_err(|e| e.to_string())?;
    Ok(outs.into_iter().map(|p| p.to_string_lossy().to_string()).collect())
}

#[tauri::command]
pub async fn pdf_from_images(
    image_paths: Vec<String>,
    output_path: String,
) -> Result<(), String> {
    let imgs: Vec<PathBuf> = image_paths.into_iter().map(PathBuf::from).collect();
    transform::images_to_pdf(&imgs, &PathBuf::from(output_path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_set_metadata(
    input_path: String,
    output_path: String,
    title: Option<String>,
    author: Option<String>,
    subject: Option<String>,
    keywords: Option<String>,
) -> Result<(), String> {
    transform::set_metadata(
        &PathBuf::from(input_path),
        &PathBuf::from(output_path),
        &PdfMetadataEdit {
            title,
            author,
            subject,
            keywords,
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_add_formatted_text(
    input_path: String,
    output_path: String,
    page_index: u16,
    text: String,
    x: f32,
    y: f32,
    font_size: f32,
    color_r: u8,
    color_g: u8,
    color_b: u8,
    ttf_path: Option<String>,
    family_fallback: String,
    bold: bool,
    italic: bool,
) -> Result<(), String> {
    transform::add_formatted_text(
        &PathBuf::from(input_path),
        &PathBuf::from(output_path),
        page_index,
        &text,
        x,
        y,
        font_size,
        (color_r, color_g, color_b),
        ttf_path.as_deref().map(std::path::Path::new),
        &family_fallback,
        bold,
        italic,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_list_system_fonts() -> Result<Vec<(String, String)>, String> {
    transform::list_system_fonts().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_stamp_text(
    input_path: String,
    output_path: String,
    text: String,
    font_size: f32,
    color_r: u8,
    color_g: u8,
    color_b: u8,
    position: String,
    only_page: Option<u16>,
) -> Result<(), String> {
    use crate::pdf::transform::StampPosition;
    let pos = match position.as_str() {
        "top-left" => StampPosition::TopLeft,
        "top-center" => StampPosition::TopCenter,
        "top-right" => StampPosition::TopRight,
        "bottom-left" => StampPosition::BottomLeft,
        "bottom-center" => StampPosition::BottomCenter,
        "bottom-right" => StampPosition::BottomRight,
        "center" => StampPosition::Center,
        _ => StampPosition::TopRight,
    };
    transform::apply_text_stamp(
        &PathBuf::from(input_path),
        &PathBuf::from(output_path),
        &text,
        font_size,
        (color_r, color_g, color_b),
        pos,
        only_page,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_watermark(
    input_path: String,
    output_path: String,
    text: String,
    font_size: f32,
    opacity: f32,
) -> Result<(), String> {
    transform::apply_text_watermark(
        &PathBuf::from(input_path),
        &PathBuf::from(output_path),
        &text,
        font_size,
        opacity,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_page_numbers(
    input_path: String,
    output_path: String,
    format: String,
    font_size: f32,
) -> Result<(), String> {
    transform::add_page_numbers(
        &PathBuf::from(input_path),
        &PathBuf::from(output_path),
        &format,
        font_size,
    )
    .map_err(|e| e.to_string())
}

#[derive(serde::Deserialize)]
pub struct RedactRectDto {
    pub page: u16,
    pub bottom: f32,
    pub left: f32,
    pub top: f32,
    pub right: f32,
}

#[tauri::command]
pub async fn pdf_redact(
    input_path: String,
    output_path: String,
    rects: Vec<RedactRectDto>,
) -> Result<(), String> {
    let mapped: Vec<crate::pdf::transform::RedactRect> = rects
        .into_iter()
        .map(|r| crate::pdf::transform::RedactRect {
            page: r.page,
            bottom: r.bottom,
            left: r.left,
            top: r.top,
            right: r.right,
        })
        .collect();
    transform::apply_redactions(
        &PathBuf::from(input_path),
        &PathBuf::from(output_path),
        &mapped,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_crop_uniform(
    input_path: String,
    output_path: String,
    top: f32,
    right: f32,
    bottom: f32,
    left: f32,
) -> Result<(), String> {
    transform::crop_pages_uniform(
        &PathBuf::from(input_path),
        &PathBuf::from(output_path),
        top,
        right,
        bottom,
        left,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_rotate_document(
    input_path: String,
    output_path: String,
    degrees: i32,
) -> Result<(), String> {
    transform::rotate_document(
        &PathBuf::from(input_path),
        &PathBuf::from(output_path),
        degrees,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_compress(
    input_path: String,
    output_path: String,
) -> Result<(u64, u64), String> {
    let inp = PathBuf::from(&input_path);
    let out = PathBuf::from(&output_path);
    let before = std::fs::metadata(&inp).map(|m| m.len()).unwrap_or(0);
    transform::compress_pdf(&inp, &out).map_err(|e| e.to_string())?;
    let after = std::fs::metadata(&out).map(|m| m.len()).unwrap_or(0);
    Ok((before, after))
}

#[tauri::command]
pub async fn pdf_ocr(
    input_path: String,
    lang: String,
) -> Result<String, String> {
    transform::ocr_pdf(&PathBuf::from(input_path), &lang).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_list_form_fields(
    input_path: String,
) -> Result<Vec<(String, Option<String>)>, String> {
    transform::list_form_fields(&PathBuf::from(input_path))
        .map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
pub struct PageDiffDto {
    pub page: u16,
    pub only_in_a: Vec<String>,
    pub only_in_b: Vec<String>,
}

#[tauri::command]
pub async fn pdf_compare(
    path_a: String,
    path_b: String,
) -> Result<Vec<PageDiffDto>, String> {
    let diffs = transform::compare_pdfs_text(
        &PathBuf::from(path_a),
        &PathBuf::from(path_b),
    )
    .map_err(|e| e.to_string())?;
    Ok(diffs
        .into_iter()
        .map(|d| PageDiffDto {
            page: d.page,
            only_in_a: d.only_in_a,
            only_in_b: d.only_in_b,
        })
        .collect())
}

#[derive(serde::Deserialize)]
pub struct BookmarkDto {
    pub title: String,
    pub page: u16,
}

#[tauri::command]
pub async fn pdf_set_bookmarks(
    input_path: String,
    output_path: String,
    bookmarks: Vec<BookmarkDto>,
) -> Result<(), String> {
    let mapped: Vec<crate::pdf::transform::BookmarkEntry> = bookmarks
        .into_iter()
        .map(|b| crate::pdf::transform::BookmarkEntry {
            title: b.title,
            page: b.page,
        })
        .collect();
    transform::set_flat_bookmarks(
        &PathBuf::from(input_path),
        &PathBuf::from(output_path),
        &mapped,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_stamp_image(
    input_path: String,
    output_path: String,
    page_index: u16,
    image_path: String,
    left: f32,
    bottom: f32,
    width: f32,
    height: f32,
) -> Result<(), String> {
    transform::stamp_image(
        &PathBuf::from(input_path),
        &PathBuf::from(output_path),
        page_index,
        &PathBuf::from(image_path),
        left,
        bottom,
        width,
        height,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pdf_extract_text_to_file(
    input_path: String,
    output_path: String,
) -> Result<(), String> {
    transform::extract_text_to_file(
        &PathBuf::from(input_path),
        &PathBuf::from(output_path),
    )
    .map_err(|e| e.to_string())
}
