// Transformation operations: duplicate, blank page, export image, images-to-pdf,
// metadata, compression.
use crate::error::{AppError, Result};
use crate::pdf::engine::pdfium;
use lopdf::{dictionary, Document, Object};
use pdfium_render::prelude::*;
use std::path::{Path, PathBuf};

// ====== HELPERS ======

/// Load an image auto-detecting format by magic bytes (not extension).
/// Handles common misnamed cases: .jpg that is actually WEBP, .png that is GIF, etc.
fn load_image_auto(path: &Path) -> Result<image::DynamicImage> {
    use std::io::BufReader;
    let file = std::fs::File::open(path).map_err(|e| {
        AppError::Io(format!("Open image {}: {}", path.display(), e))
    })?;
    let reader = image::ImageReader::new(BufReader::new(file))
        .with_guessed_format()
        .map_err(|e| {
            AppError::Io(format!("Read image {}: {}", path.display(), e))
        })?;
    let fmt = reader.format();
    reader.decode().map_err(|e| {
        let ext = path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("?");
        let actual = fmt
            .map(|f| format!("{:?}", f))
            .unwrap_or_else(|| "desconocido".into());
        AppError::Io(format!(
            "No se pudo decodificar la imagen {}: {}\nExtensión del archivo: .{}, formato real detectado: {}. Si la extensión y el contenido no coinciden, renómbrala o conviértela con un editor de imágenes.",
            path.display(),
            e,
            ext,
            actual
        ))
    })
}

// ====== DUPLICATE PAGE ======

/// Duplicate `page_index` (0-based), inserting the copy immediately after it.
pub fn duplicate_page(input: &Path, output: &Path, page_index: u16) -> Result<()> {
    let pdfium = pdfium()?;
    let source = pdfium
        .load_pdf_from_file(input, None)
        .map_err(|e| AppError::Pdf(e.to_string()))?;
    let total = source.pages().len() as i32;
    if (page_index as i32) >= total {
        return Err(AppError::InvalidInput(format!(
            "page_index {} out of range (total {})",
            page_index, total
        )));
    }

    let mut merged = pdfium
        .create_new_pdf()
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    merged
        .pages_mut()
        .copy_page_range_from_document(&source, 0..=(total - 1), 0)
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    merged
        .pages_mut()
        .copy_page_range_from_document(
            &source,
            (page_index as i32)..=(page_index as i32),
            (page_index as i32) + 1,
        )
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    merged
        .save_to_file(output)
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

// ====== INSERT BLANK PAGE ======

/// Insert a blank A4-portrait page at the given 0-based index.
/// If width_points and height_points are provided, uses custom size; otherwise A4.
pub fn insert_blank_page(
    input: &Path,
    output: &Path,
    at_index: u16,
    width_points: Option<f32>,
    height_points: Option<f32>,
) -> Result<()> {
    let pdfium = pdfium()?;
    let source = pdfium
        .load_pdf_from_file(input, None)
        .map_err(|e| AppError::Pdf(e.to_string()))?;
    let total = source.pages().len() as i32;
    if (at_index as i32) > total {
        return Err(AppError::InvalidInput(format!(
            "at_index {} out of range (total {})",
            at_index, total
        )));
    }

    let mut merged = pdfium
        .create_new_pdf()
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    if at_index > 0 {
        merged
            .pages_mut()
            .copy_page_range_from_document(&source, 0..=((at_index as i32) - 1), 0)
            .map_err(|e| AppError::Pdf(e.to_string()))?;
    }

    let paper_size = match (width_points, height_points) {
        (Some(w), Some(h)) => {
            PdfPagePaperSize::from_points(PdfPoints::new(w), PdfPoints::new(h))
        }
        _ => PdfPagePaperSize::a4(),
    };
    merged
        .pages_mut()
        .create_page_at_index(paper_size, at_index as i32)
        .map_err(|e| AppError::Pdf(format!("Create blank page failed: {}", e)))?;

    if (at_index as i32) < total {
        merged
            .pages_mut()
            .copy_page_range_from_document(
                &source,
                (at_index as i32)..=(total - 1),
                (at_index as i32) + 1,
            )
            .map_err(|e| AppError::Pdf(e.to_string()))?;
    }

    merged
        .save_to_file(output)
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

// ====== EXPORT PAGE AS PNG/JPG ======

#[derive(Clone, Copy)]
pub enum ImageFmt {
    Png,
    Jpeg,
}

pub fn export_page_as_image(
    input: &Path,
    page_index: u16,
    output: &Path,
    dpi: f32,
    fmt: ImageFmt,
) -> Result<()> {
    let pdfium = pdfium()?;
    let doc = pdfium
        .load_pdf_from_file(input, None)
        .map_err(|e| AppError::Pdf(e.to_string()))?;
    let page = doc
        .pages()
        .get(page_index as i32)
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    let scale = dpi / 72.0;
    let config = PdfRenderConfig::new().scale_page_by_factor(scale);
    let bitmap = page
        .render_with_config(&config)
        .map_err(|e| AppError::Pdf(format!("Render failed: {}", e)))?;
    let image = bitmap
        .as_image()
        .map_err(|e| AppError::Pdf(format!("Bitmap to image failed: {}", e)))?;

    let format = match fmt {
        ImageFmt::Png => image::ImageFormat::Png,
        ImageFmt::Jpeg => image::ImageFormat::Jpeg,
    };

    match fmt {
        ImageFmt::Jpeg => {
            let rgb = image.to_rgb8();
            rgb.save_with_format(output, format)
                .map_err(|e| AppError::Io(format!("Save JPEG failed: {}", e)))?;
        }
        ImageFmt::Png => {
            image
                .save_with_format(output, format)
                .map_err(|e| AppError::Io(format!("Save PNG failed: {}", e)))?;
        }
    }
    Ok(())
}

pub fn export_all_pages_as_images(
    input: &Path,
    output_dir: &Path,
    dpi: f32,
    fmt: ImageFmt,
) -> Result<Vec<PathBuf>> {
    std::fs::create_dir_all(output_dir)?;
    let stem = input
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "page".into());
    let ext = match fmt {
        ImageFmt::Png => "png",
        ImageFmt::Jpeg => "jpg",
    };

    let pdfium = pdfium()?;
    let doc = pdfium
        .load_pdf_from_file(input, None)
        .map_err(|e| AppError::Pdf(e.to_string()))?;
    let total = doc.pages().len() as u16;
    drop(doc);
    drop(pdfium);

    let mut outputs = Vec::with_capacity(total as usize);
    for i in 0..total {
        let out = output_dir.join(format!("{}-p{:03}.{}", stem, i + 1, ext));
        export_page_as_image(input, i, &out, dpi, fmt)?;
        outputs.push(out);
    }
    Ok(outputs)
}

// ====== IMAGES TO PDF ======

pub fn images_to_pdf(images: &[PathBuf], output: &Path) -> Result<()> {
    if images.is_empty() {
        return Err(AppError::InvalidInput("no images provided".into()));
    }
    let pdfium = pdfium()?;
    let mut doc = pdfium
        .create_new_pdf()
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    for img_path in images {
        let img = load_image_auto(img_path)?;
        let (img_w, img_h) = (img.width() as f32, img.height() as f32);

        let page_w = 595.0_f32;
        let page_h = 842.0_f32;
        let scale = (page_w / img_w).min(page_h / img_h);
        let draw_w = img_w * scale;
        let draw_h = img_h * scale;
        let offset_x = (page_w - draw_w) / 2.0;
        let offset_y = (page_h - draw_h) / 2.0;

        let paper = PdfPagePaperSize::a4();
        let mut page = doc
            .pages_mut()
            .create_page_at_end(paper)
            .map_err(|e| AppError::Pdf(format!("Create page failed: {}", e)))?;

        let mut obj = PdfPageImageObject::new_with_size(
            &doc,
            &img,
            PdfPoints::new(draw_w),
            PdfPoints::new(draw_h),
        )
        .map_err(|e| AppError::Pdf(format!("Create image object: {}", e)))?;

        obj.translate(PdfPoints::new(offset_x), PdfPoints::new(offset_y))
            .map_err(|e| AppError::Pdf(format!("Translate image: {}", e)))?;

        page.objects_mut()
            .add_image_object(obj)
            .map_err(|e| AppError::Pdf(format!("Add image to page: {}", e)))?;
    }

    doc.save_to_file(output)
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

// ====== METADATA ======

pub struct PdfMetadataEdit {
    pub title: Option<String>,
    pub author: Option<String>,
    pub subject: Option<String>,
    pub keywords: Option<String>,
}

pub fn set_metadata(input: &Path, output: &Path, edit: &PdfMetadataEdit) -> Result<()> {
    let mut doc = Document::load(input).map_err(|e| AppError::Pdf(e.to_string()))?;

    let info_id = match doc.trailer.get(b"Info") {
        Ok(Object::Reference(id)) => Some(*id),
        _ => None,
    };

    let info_dict_id = if let Some(id) = info_id {
        id
    } else {
        let new_id = doc.add_object(dictionary! {});
        doc.trailer.set("Info", Object::Reference(new_id));
        new_id
    };

    let info_dict = doc
        .get_object_mut(info_dict_id)
        .and_then(|o| o.as_dict_mut())
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    fn set_str(dict: &mut lopdf::Dictionary, key: &[u8], value: &str) {
        dict.set(
            key,
            Object::String(value.as_bytes().to_vec(), lopdf::StringFormat::Literal),
        );
    }

    if let Some(v) = &edit.title {
        set_str(info_dict, b"Title", v);
    }
    if let Some(v) = &edit.author {
        set_str(info_dict, b"Author", v);
    }
    if let Some(v) = &edit.subject {
        set_str(info_dict, b"Subject", v);
    }
    if let Some(v) = &edit.keywords {
        set_str(info_dict, b"Keywords", v);
    }

    doc.save(output).map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

// ====== ADD TEXT CON FORMATO ======

/// Add multi-line formatted text at a specific (x, y) position on a page.
/// If `ttf_path` is provided, loads that TTF font (Windows system font or any
/// .ttf file path). Otherwise uses Helvetica/Times/Courier built-in based on
/// `family_fallback` ("helvetica", "times", "courier").
pub fn add_formatted_text(
    input: &Path,
    output: &Path,
    page_index: u16,
    text: &str,
    x: f32,
    y: f32,
    font_size: f32,
    color: (u8, u8, u8),
    ttf_path: Option<&Path>,
    family_fallback: &str,
    bold: bool,
    italic: bool,
) -> Result<()> {
    let pdfium = pdfium()?;
    let mut doc = pdfium
        .load_pdf_from_file(input, None)
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    let font_token = if let Some(p) = ttf_path {
        doc.fonts_mut()
            .load_true_type_from_file(p, false)
            .map_err(|e| AppError::Pdf(format!("Load TTF '{}': {}", p.display(), e)))?
    } else {
        match (family_fallback, bold, italic) {
            ("times", false, false) => doc.fonts_mut().times_roman(),
            ("times", true, false) => doc.fonts_mut().times_bold(),
            ("times", false, true) => doc.fonts_mut().times_italic(),
            ("times", true, true) => doc.fonts_mut().times_bold_italic(),
            ("courier", false, false) => doc.fonts_mut().courier(),
            ("courier", true, false) => doc.fonts_mut().courier_bold(),
            ("courier", false, true) => doc.fonts_mut().courier_oblique(),
            ("courier", true, true) => doc.fonts_mut().courier_bold_oblique(),
            (_, false, false) => doc.fonts_mut().helvetica(),
            (_, true, false) => doc.fonts_mut().helvetica_bold(),
            (_, false, true) => doc.fonts_mut().helvetica_oblique(),
            (_, true, true) => doc.fonts_mut().helvetica_bold_oblique(),
        }
    };

    let total = doc.pages().len();
    if (page_index as i32) >= total {
        return Err(AppError::InvalidInput(format!(
            "page_index {} out of range ({})",
            page_index, total
        )));
    }

    let line_height = font_size * 1.3;
    for (i, line) in text.lines().enumerate() {
        if line.is_empty() {
            continue;
        }
        let mut obj = PdfPageTextObject::new(
            &doc,
            line,
            font_token,
            PdfPoints::new(font_size),
        )
        .map_err(|e| AppError::Pdf(format!("text object: {}", e)))?;
        obj.set_fill_color(PdfColor::new(color.0, color.1, color.2, 255))
            .map_err(|e| AppError::Pdf(e.to_string()))?;
        let dy = i as f32 * line_height;
        obj.translate(PdfPoints::new(x), PdfPoints::new(y - dy))
            .map_err(|e| AppError::Pdf(e.to_string()))?;

        let mut page = doc
            .pages()
            .get(page_index as i32)
            .map_err(|e| AppError::Pdf(e.to_string()))?;
        page.objects_mut()
            .add_text_object(obj)
            .map_err(|e| AppError::Pdf(e.to_string()))?;
    }

    doc.save_to_file(output)
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

/// List TTF/OTF fonts available in Windows' Fonts directory. Returns a list of
/// (family_name, font_file_path) pairs. Family name is derived from filename.
pub fn list_system_fonts() -> Result<Vec<(String, String)>> {
    let fonts_dir = std::path::PathBuf::from("C:\\Windows\\Fonts");
    if !fonts_dir.exists() {
        return Ok(Vec::new());
    }
    let mut out = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&fonts_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let ext = path
                .extension()
                .and_then(|s| s.to_str())
                .map(|s| s.to_lowercase());
            if !matches!(ext.as_deref(), Some("ttf") | Some("otf")) {
                continue;
            }
            let name = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_string();
            if name.is_empty() {
                continue;
            }
            out.push((name, path.to_string_lossy().to_string()));
        }
    }
    out.sort_by(|a, b| a.0.to_lowercase().cmp(&b.0.to_lowercase()));
    Ok(out)
}

// ====== TEXT STAMP (posición fija) ======

pub enum StampPosition {
    TopLeft,
    TopCenter,
    TopRight,
    BottomLeft,
    BottomCenter,
    BottomRight,
    Center,
}

pub fn apply_text_stamp(
    input: &Path,
    output: &Path,
    text: &str,
    font_size: f32,
    color: (u8, u8, u8),
    position: StampPosition,
    only_page: Option<u16>,
) -> Result<()> {
    let pdfium = pdfium()?;
    let mut doc = pdfium
        .load_pdf_from_file(input, None)
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    let font_token = doc.fonts_mut().helvetica_bold();
    let total = doc.pages().len();

    for i in 0..total {
        if let Some(p) = only_page {
            if i as u16 != p {
                continue;
            }
        }
        let (page_w, page_h) = {
            let page = doc
                .pages()
                .get(i as i32)
                .map_err(|e| AppError::Pdf(e.to_string()))?;
            (page.width().value, page.height().value)
        };

        let text_w_est = text.chars().count() as f32 * font_size * 0.55;
        let margin = 20.0_f32;
        let (x, y) = match position {
            StampPosition::TopLeft => (margin, page_h - margin - font_size),
            StampPosition::TopCenter => (
                (page_w - text_w_est) / 2.0,
                page_h - margin - font_size,
            ),
            StampPosition::TopRight => (
                page_w - text_w_est - margin,
                page_h - margin - font_size,
            ),
            StampPosition::BottomLeft => (margin, margin),
            StampPosition::BottomCenter => ((page_w - text_w_est) / 2.0, margin),
            StampPosition::BottomRight => (page_w - text_w_est - margin, margin),
            StampPosition::Center => ((page_w - text_w_est) / 2.0, page_h / 2.0),
        };

        let mut obj = PdfPageTextObject::new(
            &doc,
            text,
            font_token,
            PdfPoints::new(font_size),
        )
        .map_err(|e| AppError::Pdf(e.to_string()))?;
        obj.set_fill_color(PdfColor::new(color.0, color.1, color.2, 255))
            .map_err(|e| AppError::Pdf(e.to_string()))?;
        obj.translate(PdfPoints::new(x), PdfPoints::new(y))
            .map_err(|e| AppError::Pdf(e.to_string()))?;

        let mut page = doc
            .pages()
            .get(i as i32)
            .map_err(|e| AppError::Pdf(e.to_string()))?;
        page.objects_mut()
            .add_text_object(obj)
            .map_err(|e| AppError::Pdf(e.to_string()))?;
    }

    doc.save_to_file(output)
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

// ====== TEXT WATERMARK ======

pub fn apply_text_watermark(
    input: &Path,
    output: &Path,
    text: &str,
    font_size: f32,
    opacity: f32,
) -> Result<()> {
    let pdfium = pdfium()?;
    let mut doc = pdfium
        .load_pdf_from_file(input, None)
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    let font_token = doc.fonts_mut().helvetica();
    let clamped = opacity.clamp(0.0, 1.0);
    let alpha = (clamped * 255.0) as u8;

    let page_count = doc.pages().len();
    for i in 0..page_count {
        let (page_w, page_h) = {
            let page = doc
                .pages()
                .get(i as i32)
                .map_err(|e| AppError::Pdf(e.to_string()))?;
            (page.width().value, page.height().value)
        };

        let mut obj = PdfPageTextObject::new(
            &doc,
            text,
            font_token,
            PdfPoints::new(font_size),
        )
        .map_err(|e| AppError::Pdf(format!("text object page {}: {}", i, e)))?;

        obj.set_fill_color(PdfColor::new(200, 50, 50, alpha))
            .map_err(|e| AppError::Pdf(e.to_string()))?;
        obj.translate(
            PdfPoints::new(page_w * 0.2),
            PdfPoints::new(page_h * 0.4),
        )
        .map_err(|e| AppError::Pdf(e.to_string()))?;
        obj.rotate_counter_clockwise_degrees(45.0)
            .map_err(|e| AppError::Pdf(e.to_string()))?;

        let mut page = doc
            .pages()
            .get(i as i32)
            .map_err(|e| AppError::Pdf(e.to_string()))?;
        page.objects_mut()
            .add_text_object(obj)
            .map_err(|e| AppError::Pdf(e.to_string()))?;
    }

    doc.save_to_file(output)
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

// ====== PAGE NUMBERS ======

pub fn add_page_numbers(
    input: &Path,
    output: &Path,
    format: &str,
    font_size: f32,
) -> Result<()> {
    let pdfium = pdfium()?;
    let mut doc = pdfium
        .load_pdf_from_file(input, None)
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    let font_token = doc.fonts_mut().helvetica();
    let total = doc.pages().len();

    for i in 0..total {
        let page_w = {
            let page = doc
                .pages()
                .get(i as i32)
                .map_err(|e| AppError::Pdf(e.to_string()))?;
            page.width().value
        };

        let n = (i + 1) as usize;
        let label = format
            .replace("{n}", &n.to_string())
            .replace("{total}", &(total as usize).to_string());

        let mut obj = PdfPageTextObject::new(
            &doc,
            &label,
            font_token,
            PdfPoints::new(font_size),
        )
        .map_err(|e| AppError::Pdf(e.to_string()))?;
        obj.set_fill_color(PdfColor::new(30, 30, 30, 255))
            .map_err(|e| AppError::Pdf(e.to_string()))?;
        obj.translate(
            PdfPoints::new(page_w / 2.0 - (label.len() as f32 * font_size * 0.25)),
            PdfPoints::new(20.0),
        )
        .map_err(|e| AppError::Pdf(e.to_string()))?;

        let mut page = doc
            .pages()
            .get(i as i32)
            .map_err(|e| AppError::Pdf(e.to_string()))?;
        page.objects_mut()
            .add_text_object(obj)
            .map_err(|e| AppError::Pdf(e.to_string()))?;
    }

    doc.save_to_file(output)
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

// ====== REDACTION ======

#[derive(Clone, Copy)]
pub struct RedactRect {
    pub page: u16,
    pub bottom: f32,
    pub left: f32,
    pub top: f32,
    pub right: f32,
}

/// Apply opaque black rectangles over the specified regions on each page.
/// Visual redaction — underlying text is covered but not removed from the PDF
/// object stream. Sufficient for print/share; not forensic-grade.
pub fn apply_redactions(input: &Path, output: &Path, rects: &[RedactRect]) -> Result<()> {
    let pdfium = pdfium()?;
    let doc = pdfium
        .load_pdf_from_file(input, None)
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    for r in rects {
        let rect = PdfRect::new_from_values(r.bottom, r.left, r.top, r.right);
        let path = PdfPagePathObject::new_rect(
            &doc,
            rect,
            None,
            None,
            Some(PdfColor::new(0, 0, 0, 255)),
        )
        .map_err(|e| AppError::Pdf(format!("create rect path: {}", e)))?;

        let mut page = doc
            .pages()
            .get(r.page as i32)
            .map_err(|e| AppError::Pdf(e.to_string()))?;
        page.objects_mut()
            .add_path_object(path)
            .map_err(|e| AppError::Pdf(format!("add redact rect: {}", e)))?;
    }

    doc.save_to_file(output)
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

// ====== CROP PAGES ======

/// Set CropBox on all pages to a margin-shrunk box. Margins in points.
pub fn crop_pages_uniform(
    input: &Path,
    output: &Path,
    top: f32,
    right: f32,
    bottom: f32,
    left: f32,
) -> Result<()> {
    let mut doc = Document::load(input).map_err(|e| AppError::Pdf(e.to_string()))?;
    let pages_map = doc.get_pages();
    let page_ids: Vec<_> = pages_map.values().copied().collect();

    for page_id in page_ids {
        let media = {
            let page = doc
                .get_object(page_id)
                .and_then(|o| o.as_dict())
                .map_err(|e| AppError::Pdf(e.to_string()))?;
            match page.get(b"MediaBox") {
                Ok(Object::Array(arr)) if arr.len() == 4 => arr.clone(),
                _ => continue,
            }
        };
        let to_f = |o: &Object| -> f32 {
            match o {
                Object::Integer(n) => *n as f32,
                Object::Real(n) => *n,
                _ => 0.0,
            }
        };
        let x1 = to_f(&media[0]);
        let y1 = to_f(&media[1]);
        let x2 = to_f(&media[2]);
        let y2 = to_f(&media[3]);
        let new_box = vec![
            Object::Real(x1 + left),
            Object::Real(y1 + bottom),
            Object::Real(x2 - right),
            Object::Real(y2 - top),
        ];

        let page_mut = doc
            .get_object_mut(page_id)
            .and_then(|o| o.as_dict_mut())
            .map_err(|e| AppError::Pdf(e.to_string()))?;
        page_mut.set(*b"CropBox", Object::Array(new_box));
    }

    doc.save(output).map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

// ====== ROTATE WHOLE DOCUMENT ======

pub fn rotate_document(input: &Path, output: &Path, degrees: i32) -> Result<()> {
    let mut doc = Document::load(input).map_err(|e| AppError::Pdf(e.to_string()))?;
    let pages_map = doc.get_pages();
    let page_ids: Vec<_> = pages_map.values().copied().collect();
    for page_id in page_ids {
        let page = doc
            .get_object_mut(page_id)
            .and_then(|o| o.as_dict_mut())
            .map_err(|e| AppError::Pdf(e.to_string()))?;
        let current = page
            .get(b"Rotate")
            .and_then(|o| o.as_i64())
            .unwrap_or(0) as i32;
        let new = ((current + degrees) % 360 + 360) % 360;
        page.set(*b"Rotate", Object::Integer(new as i64));
    }
    doc.save(output).map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

// ====== STAMP IMAGE ======

pub fn stamp_image(
    input: &Path,
    output: &Path,
    page_index: u16,
    image_path: &Path,
    left: f32,
    bottom: f32,
    width: f32,
    height: f32,
) -> Result<()> {
    let img = load_image_auto(image_path)?;

    let pdfium = pdfium()?;
    let doc = pdfium
        .load_pdf_from_file(input, None)
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    let total = doc.pages().len();
    if (page_index as i32) >= total {
        return Err(AppError::InvalidInput(format!(
            "page_index {} out of range (total {})",
            page_index, total
        )));
    }

    let mut obj = PdfPageImageObject::new_with_size(
        &doc,
        &img,
        PdfPoints::new(width),
        PdfPoints::new(height),
    )
    .map_err(|e| AppError::Pdf(format!("Create image object: {}", e)))?;

    obj.translate(PdfPoints::new(left), PdfPoints::new(bottom))
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    let mut page = doc
        .pages()
        .get(page_index as i32)
        .map_err(|e| AppError::Pdf(e.to_string()))?;
    page.objects_mut()
        .add_image_object(obj)
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    doc.save_to_file(output)
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

// ====== EXTRACT TEXT TO FILE ======

pub fn extract_text_to_file(input: &Path, output: &Path) -> Result<()> {
    use std::io::Write;
    let pdfium = pdfium()?;
    let doc = pdfium
        .load_pdf_from_file(input, None)
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    let mut file = std::fs::File::create(output)
        .map_err(|e| AppError::Io(format!("Create output: {}", e)))?;

    let total = doc.pages().len();
    for i in 0..total {
        let page = doc
            .pages()
            .get(i as i32)
            .map_err(|e| AppError::Pdf(e.to_string()))?;
        let text = page
            .text()
            .map_err(|e| AppError::Pdf(e.to_string()))?
            .all();
        writeln!(file, "--- Pág {} ---", i + 1)
            .map_err(|e| AppError::Io(e.to_string()))?;
        writeln!(file, "{}\n", text).map_err(|e| AppError::Io(e.to_string()))?;
    }

    Ok(())
}

// ====== OCR (tesseract externo) ======

pub fn ocr_pdf(input: &Path, lang: &str) -> Result<String> {
    use std::process::Command;
    let tmp = std::env::temp_dir().join(format!("airpdf-ocr-{}", std::process::id()));
    std::fs::create_dir_all(&tmp)?;

    let check = Command::new("tesseract").arg("--version").output();
    match check {
        Ok(o) if o.status.success() => {}
        _ => {
            let _ = std::fs::remove_dir_all(&tmp);
            return Err(AppError::InvalidInput(
                "Tesseract no está instalado o no está en PATH. Instálalo desde https://github.com/UB-Mannheim/tesseract/wiki".into(),
            ));
        }
    }

    let pages = export_all_pages_as_images(input, &tmp, 300.0, ImageFmt::Png)?;

    let mut output = String::new();
    for (i, page_path) in pages.iter().enumerate() {
        let out_base = tmp.join(format!("p{}", i));
        let status = Command::new("tesseract")
            .arg(page_path)
            .arg(&out_base)
            .arg("-l")
            .arg(lang)
            .status()
            .map_err(|e| AppError::Io(format!("Tesseract exec: {}", e)))?;
        if !status.success() {
            continue;
        }
        let txt = out_base.with_extension("txt");
        if let Ok(content) = std::fs::read_to_string(&txt) {
            output.push_str(&format!("--- Pág {} ---\n{}\n\n", i + 1, content));
        }
    }

    let _ = std::fs::remove_dir_all(&tmp);
    Ok(output)
}

// ====== FORM FIELDS (read-only) ======

pub fn list_form_fields(input: &Path) -> Result<Vec<(String, Option<String>)>> {
    let pdfium = pdfium()?;
    let doc = pdfium
        .load_pdf_from_file(input, None)
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    match doc.form() {
        Some(form) => {
            let pages = doc.pages();
            let values = form.field_values(&pages);
            let mut out: Vec<(String, Option<String>)> =
                values.into_iter().collect();
            out.sort_by(|a, b| a.0.cmp(&b.0));
            Ok(out)
        }
        None => Ok(Vec::new()),
    }
}

// ====== COMPARE PDFs ======

pub struct PageDiff {
    pub page: u16,
    pub only_in_a: Vec<String>,
    pub only_in_b: Vec<String>,
}

pub fn compare_pdfs_text(path_a: &Path, path_b: &Path) -> Result<Vec<PageDiff>> {
    let pdfium = pdfium()?;
    let doc_a = pdfium
        .load_pdf_from_file(path_a, None)
        .map_err(|e| AppError::Pdf(format!("Load A: {}", e)))?;
    let doc_b = pdfium
        .load_pdf_from_file(path_b, None)
        .map_err(|e| AppError::Pdf(format!("Load B: {}", e)))?;

    let total_a = doc_a.pages().len();
    let total_b = doc_b.pages().len();
    let max_pages = total_a.max(total_b);
    let mut diffs = Vec::new();

    for i in 0..max_pages {
        let text_a = if i < total_a {
            match doc_a.pages().get(i as i32) {
                Ok(p) => match p.text() {
                    Ok(t) => t.all(),
                    Err(_) => String::new(),
                },
                Err(_) => String::new(),
            }
        } else {
            String::new()
        };
        let text_b = if i < total_b {
            match doc_b.pages().get(i as i32) {
                Ok(p) => match p.text() {
                    Ok(t) => t.all(),
                    Err(_) => String::new(),
                },
                Err(_) => String::new(),
            }
        } else {
            String::new()
        };

        let lines_a: std::collections::HashSet<String> = text_a
            .lines()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        let lines_b: std::collections::HashSet<String> = text_b
            .lines()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        let only_a: Vec<String> = lines_a.difference(&lines_b).cloned().collect();
        let only_b: Vec<String> = lines_b.difference(&lines_a).cloned().collect();

        if !only_a.is_empty() || !only_b.is_empty() {
            diffs.push(PageDiff {
                page: i as u16,
                only_in_a: only_a,
                only_in_b: only_b,
            });
        }
    }

    Ok(diffs)
}

// ====== BOOKMARKS / OUTLINES ======

#[derive(Clone)]
pub struct BookmarkEntry {
    pub title: String,
    pub page: u16,
}

pub fn set_flat_bookmarks(
    input: &Path,
    output: &Path,
    bookmarks: &[BookmarkEntry],
) -> Result<()> {
    let mut doc = Document::load(input).map_err(|e| AppError::Pdf(e.to_string()))?;
    let pages = doc.get_pages();

    if bookmarks.is_empty() {
        let catalog_id = doc
            .trailer
            .get(b"Root")
            .and_then(Object::as_reference)
            .map_err(|e| AppError::Pdf(e.to_string()))?;
        if let Ok(catalog) = doc
            .get_object_mut(catalog_id)
            .and_then(|o| o.as_dict_mut())
        {
            catalog.remove(b"Outlines");
        }
        doc.save(output).map_err(|e| AppError::Io(e.to_string()))?;
        return Ok(());
    }

    let total = bookmarks.len();
    let mut item_ids: Vec<lopdf::ObjectId> = Vec::with_capacity(total);
    for bm in bookmarks {
        let page_id = match pages.get(&((bm.page + 1) as u32)) {
            Some(id) => *id,
            None => continue,
        };
        let dest = Object::Array(vec![
            Object::Reference(page_id),
            "XYZ".into(),
            Object::Null,
            Object::Null,
            Object::Null,
        ]);
        let dict = dictionary! {
            "Title" => Object::String(
                bm.title.as_bytes().to_vec(),
                lopdf::StringFormat::Literal,
            ),
            "Dest" => dest,
        };
        let id = doc.add_object(dict);
        item_ids.push(id);
    }

    if item_ids.is_empty() {
        return Err(AppError::InvalidInput(
            "no valid bookmarks for existing pages".into(),
        ));
    }

    for (idx, &id) in item_ids.iter().enumerate() {
        let dict = doc
            .get_object_mut(id)
            .and_then(|o| o.as_dict_mut())
            .map_err(|e| AppError::Pdf(e.to_string()))?;
        if idx > 0 {
            dict.set("Prev", Object::Reference(item_ids[idx - 1]));
        }
        if idx + 1 < item_ids.len() {
            dict.set("Next", Object::Reference(item_ids[idx + 1]));
        }
    }

    let first_id = *item_ids.first().unwrap();
    let last_id = *item_ids.last().unwrap();
    let outlines_dict = dictionary! {
        "Type" => "Outlines",
        "First" => Object::Reference(first_id),
        "Last" => Object::Reference(last_id),
        "Count" => Object::Integer(item_ids.len() as i64),
    };
    let outlines_id = doc.add_object(outlines_dict);

    for &id in &item_ids {
        let dict = doc
            .get_object_mut(id)
            .and_then(|o| o.as_dict_mut())
            .map_err(|e| AppError::Pdf(e.to_string()))?;
        dict.set("Parent", Object::Reference(outlines_id));
    }

    let catalog_id = doc
        .trailer
        .get(b"Root")
        .and_then(Object::as_reference)
        .map_err(|e| AppError::Pdf(e.to_string()))?;
    let catalog = doc
        .get_object_mut(catalog_id)
        .and_then(|o| o.as_dict_mut())
        .map_err(|e| AppError::Pdf(e.to_string()))?;
    catalog.set("Outlines", Object::Reference(outlines_id));

    doc.save(output).map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

// ====== COMPRESS PDF ======

pub fn compress_pdf(input: &Path, output: &Path) -> Result<()> {
    let mut doc = Document::load(input).map_err(|e| AppError::Pdf(e.to_string()))?;
    doc.compress();
    doc.save(output).map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn fixture(name: &str) -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("tests")
            .join("fixtures")
            .join(name)
    }

    #[test]
    fn test_compress_round_trip() {
        let tmp = std::env::temp_dir().join("airpdf-compress.pdf");
        let r = compress_pdf(&fixture("sample-paper.pdf"), &tmp);
        assert!(r.is_ok(), "compress should succeed: {:?}", r);
    }
}
