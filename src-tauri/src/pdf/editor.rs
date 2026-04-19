// Edit operations on PDF: embed annotations, rotate, extract, delete, merge, reorder pages
use crate::error::{AppError, Result};
use crate::pdf::engine::pdfium;
use crate::storage::sidecar::{Annotation, Sidecar};
use lopdf::{dictionary, Document, Object};
use std::path::{Path, PathBuf};

// ====== EMBED ANNOTATIONS ======

/// Embed sidecar annotations as native PDF /Annot dictionaries (interoperable with Acrobat/Xodo).
pub fn embed_annotations_into_pdf(
    pdf_path: &Path,
    output_path: &Path,
    sidecar: &Sidecar,
) -> Result<()> {
    let mut doc = Document::load(pdf_path)
        .map_err(|e| AppError::Pdf(format!("Cannot load PDF: {}", e)))?;

    let pages = doc.get_pages();
    for annotation in &sidecar.annotations {
        let page_num = (annotation.page + 1) as u32;
        let page_id = match pages.get(&page_num) {
            Some(id) => *id,
            None => continue,
        };

        let pdf_annot = build_pdf_annotation(annotation);
        let annot_id = doc.add_object(pdf_annot);

        let page_dict = doc
            .get_object_mut(page_id)
            .and_then(|o| o.as_dict_mut())
            .map_err(|e| AppError::Pdf(e.to_string()))?;

        match page_dict.get_mut(b"Annots") {
            Ok(Object::Array(arr)) => arr.push(Object::Reference(annot_id)),
            _ => {
                page_dict.set(
                    *b"Annots",
                    Object::Array(vec![Object::Reference(annot_id)]),
                );
            }
        }
    }

    doc.save(output_path)
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

fn build_pdf_annotation(a: &Annotation) -> lopdf::Dictionary {
    let [x1, y1, x2, y2] = a.rect;
    let color = parse_hex_color(&a.color);

    let subtype = match a.annotation_type.as_str() {
        "highlight" => "Highlight",
        "underline" => "Underline",
        "strikethrough" => "StrikeOut",
        "rect" => "Square",
        "circle" => "Circle",
        "note" => "Text",
        "drawing" => "Ink",
        "stamp" => "Stamp",
        _ => "Square",
    };

    dictionary! {
        "Type" => "Annot",
        "Subtype" => subtype,
        "Rect" => vec![Object::Real(x1), Object::Real(y1), Object::Real(x2), Object::Real(y2)],
        "C" => vec![Object::Real(color.0), Object::Real(color.1), Object::Real(color.2)],
        "T" => Object::String(a.author.as_bytes().to_vec(), lopdf::StringFormat::Literal),
        "Contents" => Object::String(
            a.note.clone().unwrap_or_default().as_bytes().to_vec(),
            lopdf::StringFormat::Literal,
        ),
    }
}

fn parse_hex_color(hex: &str) -> (f32, f32, f32) {
    let hex = hex.trim_start_matches('#');
    if hex.len() != 6 {
        return (1.0, 1.0, 0.0);
    }
    let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(255) as f32 / 255.0;
    let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(255) as f32 / 255.0;
    let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(0) as f32 / 255.0;
    (r, g, b)
}

// ====== ROTATE PAGES ======

pub fn rotate_pages(
    input: &Path,
    output: &Path,
    pages_to_rotate: &[u16],
    degrees: i32,
) -> Result<()> {
    let mut doc = Document::load(input).map_err(|e| AppError::Pdf(e.to_string()))?;
    let pages_map = doc.get_pages();
    for &page_idx in pages_to_rotate {
        let page_num = (page_idx + 1) as u32;
        if let Some(&page_id) = pages_map.get(&page_num) {
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
    }
    doc.save(output).map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

// ====== EXTRACT / DELETE PAGES ======

pub fn extract_pages(input: &Path, output: &Path, pages: &[u16]) -> Result<()> {
    let mut doc = Document::load(input).map_err(|e| AppError::Pdf(e.to_string()))?;
    let all_pages = doc.get_pages();
    let keep: Vec<u32> = pages.iter().map(|p| (*p + 1) as u32).collect();
    let to_delete: Vec<u32> = all_pages
        .keys()
        .copied()
        .filter(|p| !keep.contains(p))
        .collect();
    doc.delete_pages(&to_delete);
    doc.compress();
    doc.save(output).map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

pub fn delete_pages(input: &Path, output: &Path, pages_to_delete: &[u16]) -> Result<()> {
    let mut doc = Document::load(input).map_err(|e| AppError::Pdf(e.to_string()))?;
    let to_delete: Vec<u32> = pages_to_delete.iter().map(|p| (*p + 1) as u32).collect();
    doc.delete_pages(&to_delete);
    doc.compress();
    doc.save(output).map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

// ====== MERGE PDFS (pdfium) ======

/// Merge multiple PDFs into a single output file, preserving order.
pub fn merge_pdfs(inputs: &[PathBuf], output: &Path) -> Result<()> {
    if inputs.is_empty() {
        return Err(AppError::InvalidInput("No input PDFs".into()));
    }

    let pdfium = pdfium()?;
    let mut merged = pdfium
        .create_new_pdf()
        .map_err(|e| AppError::Pdf(format!("Create new PDF failed: {}", e)))?;

    for input in inputs {
        let source = pdfium
            .load_pdf_from_file(input, None)
            .map_err(|e| AppError::Pdf(format!("Cannot load {}: {}", input.display(), e)))?;

        let source_page_count = source.pages().len() as i32;
        let dest_page_count = merged.pages().len() as i32;

        if source_page_count == 0 {
            continue;
        }

        // Append all pages from source into merged
        merged
            .pages_mut()
            .copy_page_range_from_document(
                &source,
                0..=(source_page_count - 1),
                dest_page_count,
            )
            .map_err(|e| AppError::Pdf(format!("Copy pages failed: {}", e)))?;
    }

    merged
        .save_to_file(output)
        .map_err(|e| AppError::Io(format!("Save failed: {}", e)))?;
    Ok(())
}

// ====== REORDER PAGES (pdfium) ======

/// Reorder pages according to new_order (0-indexed). All pages must be listed exactly once.
pub fn reorder_pages(
    input: &Path,
    output: &Path,
    new_order: &[u16],
) -> Result<()> {
    let pdfium = pdfium()?;
    let source = pdfium
        .load_pdf_from_file(input, None)
        .map_err(|e| AppError::Pdf(format!("Cannot load PDF: {}", e)))?;

    let total = source.pages().len() as i32;
    if new_order.len() != total as usize {
        return Err(AppError::InvalidInput(format!(
            "new_order has {} entries but PDF has {} pages",
            new_order.len(),
            total
        )));
    }

    let mut merged = pdfium
        .create_new_pdf()
        .map_err(|e| AppError::Pdf(format!("Create new PDF failed: {}", e)))?;

    for (dest_idx, &src_idx) in new_order.iter().enumerate() {
        let src_i32 = src_idx as i32;
        if src_i32 >= total {
            return Err(AppError::InvalidInput(format!(
                "Page index {} out of range",
                src_idx
            )));
        }
        merged
            .pages_mut()
            .copy_page_range_from_document(&source, src_i32..=src_i32, dest_idx as i32)
            .map_err(|e| AppError::Pdf(format!("Copy page {} failed: {}", src_idx, e)))?;
    }

    merged
        .save_to_file(output)
        .map_err(|e| AppError::Io(format!("Save failed: {}", e)))?;
    Ok(())
}

// ====== SPLIT PDF ======

/// Split a PDF into N pieces by cut points (0-indexed page numbers where splits happen).
/// Returns the list of output files.
pub fn split_pdf_at_pages(
    input: &Path,
    output_dir: &Path,
    splits: &[u16],
) -> Result<Vec<PathBuf>> {
    let pdfium = pdfium()?;
    let source = pdfium
        .load_pdf_from_file(input, None)
        .map_err(|e| AppError::Pdf(e.to_string()))?;
    let total = source.pages().len() as u16;

    // Build ranges based on split points
    let mut ranges: Vec<Vec<u16>> = Vec::new();
    let mut cursor = 0u16;
    for &split in splits {
        if split > cursor && split <= total {
            ranges.push((cursor..split).collect());
            cursor = split;
        }
    }
    if cursor < total {
        ranges.push((cursor..total).collect());
    }

    let stem = input
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "split".into());

    std::fs::create_dir_all(output_dir)?;

    let mut outputs = Vec::new();
    for (i, range) in ranges.iter().enumerate() {
        let out = output_dir.join(format!("{}-parte{}.pdf", stem, i + 1));
        extract_pages(input, &out, range)?;
        outputs.push(out);
    }
    Ok(outputs)
}

// ====== TESTS ======

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_hex_color_white() {
        let (r, g, b) = parse_hex_color("#FFFFFF");
        assert_eq!(r, 1.0);
        assert_eq!(g, 1.0);
        assert_eq!(b, 1.0);
    }

    #[test]
    fn test_parse_hex_color_invalid_returns_default() {
        let (r, g, b) = parse_hex_color("not-hex");
        assert_eq!(r, 1.0);
        assert_eq!(g, 1.0);
        assert_eq!(b, 0.0);
    }
}
