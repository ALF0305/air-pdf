//! Detecta paginas en blanco en un PDF y opcionalmente las elimina.
//!
//! Caso de uso clinico: cuando se digitalizan historias clinicas en
//! escaner duplex, salen muchas hojas en blanco (reverso vacio). Este
//! modulo detecta esas paginas usando dos heuristicos combinados:
//!
//! 1. Texto: si `text.trim().chars().count() <= max_text_chars`, candidata.
//! 2. Imagenes: si NO hay imagenes con bbox >= `min_image_size_pt` puntos
//!    en cualquier dimension, sigue candidata.
//!
//! Los paths/lineas vectoriales se ignoran porque pueden ser bordes,
//! marcos o headers de imprenta legitimos en una pagina por lo demas
//! vacia.

use crate::error::{AppError, Result};
use crate::pdf::editor;
use crate::pdf::engine::pdfium;
use pdfium_render::prelude::*;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone)]
pub struct BlankDetectOptions {
    /// Limite superior de caracteres "no whitespace" para considerar la
    /// pagina como sin texto. Default 3 (tolera numeros de pagina muy
    /// cortos como "1", "23").
    pub max_text_chars: usize,
    /// Tamano minimo en puntos PDF para considerar que una imagen es
    /// significativa (no un icono / pixel decorativo). Default 20.0
    /// (~7mm). Imagenes mas pequenas no descalifican la pagina.
    pub min_image_size_pt: f32,
}

impl Default for BlankDetectOptions {
    fn default() -> Self {
        Self {
            max_text_chars: 3,
            min_image_size_pt: 20.0,
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct BlankDetectionReport {
    pub total_pages: usize,
    /// Indices 0-based de las paginas detectadas como en blanco.
    pub blank_pages: Vec<u16>,
}

/// Recorre el PDF y devuelve la lista de paginas blank, sin modificar
/// el archivo.
pub fn detect_blank_pages(
    input: &Path,
    options: &BlankDetectOptions,
) -> Result<BlankDetectionReport> {
    let pdfium = pdfium()?;
    let document = pdfium
        .load_pdf_from_file(input, None)
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    let total = document.pages().len() as usize;
    let mut blanks: Vec<u16> = Vec::new();

    for (idx, page) in document.pages().iter().enumerate() {
        if is_page_blank(&page, options) {
            blanks.push(idx as u16);
        }
    }

    Ok(BlankDetectionReport {
        total_pages: total,
        blank_pages: blanks,
    })
}

fn is_page_blank(page: &PdfPage, options: &BlankDetectOptions) -> bool {
    // Heuristico 1: texto
    let text_count = match page.text() {
        Ok(t) => t.all().chars().filter(|c| !c.is_whitespace()).count(),
        Err(_) => 0,
    };
    if text_count > options.max_text_chars {
        return false;
    }

    // Heuristico 2: imagenes con bounds >= umbral
    for obj in page.objects().iter() {
        if obj.object_type() == PdfPageObjectType::Image {
            // bounds() devuelve un PdfRect; si la imagen no es decorativa
            // (>= min en ancho y/o alto), descalificamos la pagina.
            if let Ok(rect) = obj.bounds() {
                let w = (rect.right().value - rect.left().value).abs();
                let h = (rect.top().value - rect.bottom().value).abs();
                if w >= options.min_image_size_pt || h >= options.min_image_size_pt {
                    return false;
                }
            }
        }
    }

    true
}

/// Detecta paginas blank y devuelve un PDF nuevo en `output` sin ellas.
/// Si no se detecta ninguna, copia el archivo tal cual (para que el
/// llamador siempre tenga un output valido).
pub fn delete_blank_pages(
    input: &Path,
    output: &Path,
    options: &BlankDetectOptions,
) -> Result<BlankDetectionReport> {
    let report = detect_blank_pages(input, options)?;

    if report.blank_pages.is_empty() {
        std::fs::copy(input, output).map_err(|e| AppError::Io(e.to_string()))?;
        return Ok(report);
    }

    // Si TODAS las paginas son blank, no podemos producir un PDF valido
    // sin paginas. Reportamos error para que el caller decida.
    if report.blank_pages.len() == report.total_pages {
        return Err(AppError::InvalidInput(
            "Todas las paginas estan en blanco; no se puede generar un PDF vacio."
                .into(),
        ));
    }

    editor::delete_pages(input, output, &report.blank_pages)?;
    Ok(report)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_son_razonables() {
        let opts = BlankDetectOptions::default();
        assert_eq!(opts.max_text_chars, 3);
        assert!((opts.min_image_size_pt - 20.0).abs() < 0.01);
    }

    #[test]
    fn report_serializa_a_json() {
        let report = BlankDetectionReport {
            total_pages: 5,
            blank_pages: vec![1, 3],
        };
        let json = serde_json::to_string(&report).expect("serialize");
        assert!(json.contains("\"total_pages\":5"));
        assert!(json.contains("\"blank_pages\":[1,3]"));
    }

    // Tests de integracion contra fixtures reales viven en
    // tests/ separadamente. Aqui solo validamos la API publica
    // y serializacion. La logica de is_page_blank requiere PdfPage
    // real, que no podemos construir sin cargar un PDF.
}
