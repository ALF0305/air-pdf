// Text, bookmark, and search extraction from PDF
use crate::error::{AppError, Result};
use crate::pdf::engine::pdfium;
use pdfium_render::prelude::*;
use serde::Serialize;
use std::path::Path;

// ====================== TEXT EXTRACTION ======================

/// Extract all text from a single page.
pub fn extract_page_text(path: &Path, page_index: u16) -> Result<String> {
    let pdfium = pdfium()?;
    let document = pdfium
        .load_pdf_from_file(path, None)
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    let pages = document.pages();
    if (page_index as i32) >= pages.len() {
        return Err(AppError::InvalidInput(format!(
            "Page {} out of range",
            page_index
        )));
    }

    let page = pages
        .get(page_index as i32)
        .map_err(|e| AppError::Pdf(e.to_string()))?;
    let text_page = page.text().map_err(|e| AppError::Pdf(e.to_string()))?;
    Ok(text_page.all())
}

/// Extract text from all pages. Returns a Vec with one entry per page.
pub fn extract_all_text(path: &Path) -> Result<Vec<String>> {
    let pdfium = pdfium()?;
    let document = pdfium
        .load_pdf_from_file(path, None)
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    let mut texts = Vec::new();
    for page in document.pages().iter() {
        let text = page.text().map_err(|e| AppError::Pdf(e.to_string()))?;
        texts.push(text.all());
    }
    Ok(texts)
}

// ====================== DOMINANT FONT DETECTION ======================

#[derive(Debug, Clone, Serialize)]
pub struct DominantFont {
    /// Familia mapeada a una fuente del sistema disponible en el editor.
    pub font: String,
    /// Tamano en puntos PDF (redondeado al entero mas comun).
    pub size: f32,
    pub bold: bool,
    pub italic: bool,
}

/// Detecta la fuente y tamano dominantes en una pagina del PDF.
/// Devuelve None si la pagina no tiene texto.
pub fn detect_dominant_font(path: &Path, page_index: u16) -> Result<Option<DominantFont>> {
    let pdfium = pdfium()?;
    let document = pdfium
        .load_pdf_from_file(path, None)
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    let pages = document.pages();
    if (page_index as i32) >= pages.len() {
        return Ok(None);
    }

    let page = pages
        .get(page_index as i32)
        .map_err(|e| AppError::Pdf(e.to_string()))?;
    let text_page = match page.text() {
        Ok(t) => t,
        Err(_) => return Ok(None),
    };

    use std::collections::HashMap;
    let mut counts: HashMap<(String, u32, bool, bool), usize> = HashMap::new();

    for ch in text_page.chars().iter() {
        if ch.unicode_char().map(|c| c.is_whitespace()).unwrap_or(true) {
            continue;
        }
        let raw_name = ch.font_name();
        if raw_name.is_empty() {
            continue;
        }
        let (family, bold, italic) = normalize_font_name(&raw_name);
        let size = ch.unscaled_font_size().value;
        if size <= 0.0 {
            continue;
        }
        let key = (family, size.round() as u32, bold, italic);
        *counts.entry(key).or_insert(0) += 1;
    }

    if counts.is_empty() {
        return Ok(None);
    }

    let ((family, size, bold, italic), _count) = counts
        .into_iter()
        .max_by_key(|(_, c)| *c)
        .expect("counts no esta vacio");

    Ok(Some(DominantFont {
        font: family,
        size: size as f32,
        bold,
        italic,
    }))
}

/// Mapea un nombre de fuente PDF (con prefijo subset y sufijos de
/// variante) a una familia conocida + flags bold/italic.
fn normalize_font_name(raw: &str) -> (String, bool, bool) {
    let after_subset = match raw.find('+') {
        Some(i) => &raw[i + 1..],
        None => raw,
    };

    let lower = after_subset.to_lowercase();
    let bold = lower.contains("bold") || lower.contains("-bd") || lower.contains("heavy");
    let italic = lower.contains("italic") || lower.contains("oblique") || lower.contains("-it");

    let family = if lower.contains("times") {
        "Times New Roman"
    } else if lower.contains("courier") || lower.contains("mono") {
        "Courier New"
    } else if lower.contains("calibri") {
        "Calibri"
    } else if lower.contains("cambria") {
        "Cambria"
    } else if lower.contains("candara") {
        "Candara"
    } else if lower.contains("comic") {
        "Comic Sans MS"
    } else if lower.contains("consolas") {
        "Consolas"
    } else if lower.contains("constantia") {
        "Constantia"
    } else if lower.contains("corbel") {
        "Corbel"
    } else if lower.contains("georgia") {
        "Georgia"
    } else if lower.contains("impact") {
        "Impact"
    } else if lower.contains("lucida") {
        "Lucida Sans Unicode"
    } else if lower.contains("palatino") {
        "Palatino Linotype"
    } else if lower.contains("segoe") {
        "Segoe UI"
    } else if lower.contains("tahoma") {
        "Tahoma"
    } else if lower.contains("trebuchet") {
        "Trebuchet MS"
    } else if lower.contains("verdana") {
        "Verdana"
    } else {
        "Arial"
    };

    (family.to_string(), bold, italic)
}

// ====================== BOOKMARKS ======================

#[derive(Debug, Clone, Serialize)]
pub struct BookmarkNode {
    pub title: String,
    pub page: Option<u16>,
    pub children: Vec<BookmarkNode>,
}

pub fn extract_bookmarks(path: &Path) -> Result<Vec<BookmarkNode>> {
    let pdfium = pdfium()?;
    let document = pdfium
        .load_pdf_from_file(path, None)
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    let mut roots = Vec::new();
    for bookmark in document.bookmarks().iter() {
        roots.push(bookmark_to_node(&bookmark)?);
    }
    Ok(roots)
}

fn bookmark_to_node(bookmark: &PdfBookmark) -> Result<BookmarkNode> {
    let title = bookmark.title().unwrap_or_default();
    let page = bookmark
        .destination()
        .and_then(|d| d.page_index().ok())
        .map(|idx| idx as u16);

    let mut children = Vec::new();
    for child in bookmark.iter_direct_children() {
        children.push(bookmark_to_node(&child)?);
    }

    Ok(BookmarkNode {
        title,
        page,
        children,
    })
}

// ====================== SEARCH ======================

#[derive(Debug, Clone, Serialize)]
pub struct SearchMatch {
    pub page: u16,
    pub text: String,
    pub context: String,
    pub rect: [f32; 4],
}

/// Search PDF for text. Returns matches with page, text, and surrounding context.
/// Does NOT return precise rect coords; those are populated only if available
/// from PDFium text layout (future enhancement).
pub fn search_text(
    path: &Path,
    query: &str,
    case_sensitive: bool,
) -> Result<Vec<SearchMatch>> {
    if query.is_empty() {
        return Ok(Vec::new());
    }

    let pdfium = pdfium()?;
    let document = pdfium
        .load_pdf_from_file(path, None)
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    let needle = if case_sensitive {
        query.to_string()
    } else {
        query.to_lowercase()
    };
    let mut matches = Vec::new();

    for (page_idx, page) in document.pages().iter().enumerate() {
        let text_page = match page.text() {
            Ok(t) => t,
            Err(_) => continue,
        };
        let full_text = text_page.all();
        let haystack = if case_sensitive {
            full_text.clone()
        } else {
            full_text.to_lowercase()
        };

        let mut start = 0;
        while let Some(pos) = haystack[start..].find(&needle) {
            let abs_pos = start + pos;
            let context_start = abs_pos.saturating_sub(40);
            let context_end = (abs_pos + needle.len() + 40).min(full_text.len());

            // Safe slicing on char boundaries
            let context = safe_slice(&full_text, context_start, context_end);
            let matched = safe_slice(&full_text, abs_pos, abs_pos + needle.len());

            matches.push(SearchMatch {
                page: page_idx as u16,
                text: matched,
                context,
                rect: [0.0, 0.0, 0.0, 0.0],
            });

            start = abs_pos + needle.len();
        }
    }

    Ok(matches)
}

/// Slice a string safely on char boundaries.
fn safe_slice(s: &str, start: usize, end: usize) -> String {
    let mut real_start = start;
    while real_start > 0 && !s.is_char_boundary(real_start) {
        real_start -= 1;
    }
    let mut real_end = end.min(s.len());
    while real_end < s.len() && !s.is_char_boundary(real_end) {
        real_end += 1;
    }
    s[real_start..real_end].to_string()
}

// ====================== TESTS ======================

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
    fn test_extract_page_text() {
        let _ = engine::init();
        let text = extract_page_text(&fixture_path("sample-paper.pdf"), 0).unwrap();
        // Text may be empty if PDF is image-only; verify no crash
        let _ = text.len();
    }

    #[test]
    fn test_extract_all_text() {
        let _ = engine::init();
        let texts = extract_all_text(&fixture_path("sample-paper.pdf")).unwrap();
        assert!(!texts.is_empty(), "should have at least one page");
    }

    #[test]
    fn test_extract_bookmarks_does_not_crash() {
        let _ = engine::init();
        let _ = extract_bookmarks(&fixture_path("sample-paper.pdf")).unwrap();
        // Fixture may not have bookmarks; verify no crash
    }

    #[test]
    fn test_search_text_empty_query_returns_empty() {
        let _ = engine::init();
        let matches = search_text(&fixture_path("sample-paper.pdf"), "", false).unwrap();
        assert_eq!(matches.len(), 0);
    }

    #[test]
    fn test_search_text_nonexistent_returns_empty() {
        let _ = engine::init();
        let matches =
            search_text(&fixture_path("sample-paper.pdf"), "xyzabc999notfound", false)
                .unwrap();
        assert_eq!(matches.len(), 0);
    }

    #[test]
    fn test_search_text_does_not_crash() {
        let _ = engine::init();
        let _ = search_text(&fixture_path("sample-paper.pdf"), "the", false).unwrap();
    }
}
