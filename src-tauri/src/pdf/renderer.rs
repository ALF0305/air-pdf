// Render PDF page to PNG bytes using PDFium
use crate::error::{AppError, Result};
use crate::pdf::engine::pdfium;
use pdfium_render::prelude::*;
use std::path::Path;

/// Render a single PDF page to PNG byte array at the given scale factor.
/// scale=1.0 is baseline; scale=2.0 doubles resolution.
pub fn render_page_to_png(
    path: &Path,
    page_index: u16,
    scale: f32,
) -> Result<Vec<u8>> {
    let pdfium = pdfium()?;
    let document = pdfium
        .load_pdf_from_file(path, None)
        .map_err(|e| AppError::Pdf(format!("Cannot open PDF: {}", e)))?;

    let pages = document.pages();
    let page_count = pages.len();
    if (page_index as i32) >= page_count {
        return Err(AppError::InvalidInput(format!(
            "Page {} out of range (total: {})",
            page_index, page_count
        )));
    }

    let page = pages
        .get(page_index as i32)
        .map_err(|e| AppError::Pdf(format!("Cannot get page: {}", e)))?;

    let render_config = PdfRenderConfig::new().scale_page_by_factor(scale);
    let bitmap = page
        .render_with_config(&render_config)
        .map_err(|e| AppError::Pdf(format!("Render failed: {}", e)))?;

    let image = bitmap
        .as_image()
        .map_err(|e| AppError::Pdf(format!("Bitmap to image failed: {}", e)))?;
    let mut png_bytes: Vec<u8> = Vec::new();
    image
        .write_to(
            &mut std::io::Cursor::new(&mut png_bytes),
            image::ImageFormat::Png,
        )
        .map_err(|e| AppError::Pdf(format!("PNG encode failed: {}", e)))?;

    Ok(png_bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pdf::engine;
    use std::path::PathBuf;

    fn fixture_path(name: &str) -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("tests")
            .join("fixtures")
            .join(name)
    }

    #[test]
    fn test_render_page_returns_png() {
        let _ = engine::init();
        let png = render_page_to_png(&fixture_path("sample-paper.pdf"), 0, 1.0)
            .expect("should render");
        assert!(png.len() > 100, "PNG should have content");
        assert_eq!(&png[0..4], b"\x89PNG", "should be PNG magic bytes");
    }

    #[test]
    fn test_render_invalid_page_returns_error() {
        let _ = engine::init();
        let result = render_page_to_png(&fixture_path("sample-paper.pdf"), 9999, 1.0);
        assert!(result.is_err());
    }

    #[test]
    fn test_render_at_2x_scale_produces_larger_png() {
        let _ = engine::init();
        let png_1x =
            render_page_to_png(&fixture_path("sample-paper.pdf"), 0, 1.0).unwrap();
        let png_2x =
            render_page_to_png(&fixture_path("sample-paper.pdf"), 0, 2.0).unwrap();
        assert!(
            png_2x.len() > png_1x.len(),
            "2x scale should produce larger PNG ({} vs {})",
            png_2x.len(),
            png_1x.len()
        );
    }
}
