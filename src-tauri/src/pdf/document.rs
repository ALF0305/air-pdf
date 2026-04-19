// Document metadata and page info extraction
use crate::error::{AppError, Result};
use crate::pdf::engine::pdfium;
use pdfium_render::prelude::*;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentInfo {
    pub path: String,
    pub page_count: u16,
    pub title: Option<String>,
    pub author: Option<String>,
    pub subject: Option<String>,
    pub creator: Option<String>,
    pub producer: Option<String>,
    pub is_encrypted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageInfo {
    pub page_number: u16,
    pub width: f32,
    pub height: f32,
    pub rotation: u16,
}

/// Load document metadata from a PDF file.
pub fn load_document_info(path: &Path) -> Result<DocumentInfo> {
    let pdfium = pdfium()?;
    let document = pdfium
        .load_pdf_from_file(path, None)
        .map_err(|e| AppError::Pdf(format!("Cannot open PDF: {}", e)))?;

    let metadata = document.metadata();
    let title = metadata
        .get(PdfDocumentMetadataTagType::Title)
        .map(|t| t.value().to_string());
    let author = metadata
        .get(PdfDocumentMetadataTagType::Author)
        .map(|t| t.value().to_string());
    let subject = metadata
        .get(PdfDocumentMetadataTagType::Subject)
        .map(|t| t.value().to_string());
    let creator = metadata
        .get(PdfDocumentMetadataTagType::Creator)
        .map(|t| t.value().to_string());
    let producer = metadata
        .get(PdfDocumentMetadataTagType::Producer)
        .map(|t| t.value().to_string());

    Ok(DocumentInfo {
        path: path.to_string_lossy().to_string(),
        page_count: document.pages().len() as u16,
        title,
        author,
        subject,
        creator,
        producer,
        is_encrypted: false,
    })
}

/// Get per-page info (dimensions + rotation) for all pages.
pub fn get_pages_info(path: &Path) -> Result<Vec<PageInfo>> {
    let pdfium = pdfium()?;
    let document = pdfium
        .load_pdf_from_file(path, None)
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    let mut infos = Vec::new();
    for (idx, page) in document.pages().iter().enumerate() {
        let size = page.page_size();
        let rotation = match page.rotation() {
            Ok(r) => match r {
                PdfPageRenderRotation::None => 0,
                PdfPageRenderRotation::Degrees90 => 90,
                PdfPageRenderRotation::Degrees180 => 180,
                PdfPageRenderRotation::Degrees270 => 270,
            },
            Err(_) => 0,
        };
        infos.push(PageInfo {
            page_number: idx as u16,
            width: size.width().value,
            height: size.height().value,
            rotation,
        });
    }
    Ok(infos)
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
    fn test_load_document_info() {
        let _ = engine::init();
        let path = fixture_path("sample-paper.pdf");
        let info = load_document_info(&path).expect("should load");
        assert!(info.page_count > 0, "should have at least 1 page");
        assert!(!info.path.is_empty());
    }

    #[test]
    fn test_get_pages_info_matches_page_count() {
        let _ = engine::init();
        let path = fixture_path("sample-paper.pdf");
        let info = load_document_info(&path).unwrap();
        let pages = get_pages_info(&path).unwrap();
        assert_eq!(pages.len(), info.page_count as usize);
        assert!(pages[0].width > 0.0);
        assert!(pages[0].height > 0.0);
    }
}
