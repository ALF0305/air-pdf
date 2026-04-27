//! Auto-redact via regex (Plan v0.4 - Stirling mapping #2).
//!
//! Detecta y tacha automaticamente patrones sensibles (DNI, telefonos,
//! emails, etc.) usando regex sobre el texto extraido por PDFium, mapea
//! los matches a coordenadas via los bounding boxes de los caracteres
//! y luego invoca `transform::apply_redactions` para cubrir con rects
//! negros opacos.
//!
//! Uso clinico tipico: anonimizar historias clinicas para docencia,
//! papers o casos publicables sin tener que redactar manualmente.
//!
//! Limitaciones:
//! - El bounding rect se calcula con `loose_bounds` para cubrir
//!   ascenders/descenders. Puede tapar un poco mas de lo estrictamente
//!   necesario (deseable para redact: mejor cubrir de mas que de menos).
//! - Si el regex hace match dentro de palabras separadas por whitespace
//!   especial / cambios de fuente, los bounds son la union de cada char
//!   individual (correcto pero pueden verse rectangulos contiguos en vez
//!   de uno solo).
//! - Es redact VISUAL: el texto sigue en el object stream del PDF. Para
//!   forensic-grade hay que recompilar el PDF sin esos textos.

use crate::error::{AppError, Result};
use crate::pdf::engine::pdfium;
use crate::pdf::transform::{apply_redactions, RedactRect};
use pdfium_render::prelude::*;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::path::Path;

/// Patron compilado con metadata para reportes.
pub struct CompiledPattern {
    pub label: String,
    pub regex: Regex,
}

/// Reporte por patron: cuantos matches y en que paginas.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PatternHits {
    pub label: String,
    pub matches: usize,
    pub pages_with_hits: Vec<u16>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AutoRedactReport {
    pub total_redactions: usize,
    pub per_pattern: Vec<PatternHits>,
}

/// Presets pensados para Peru / uso clinico. El llamador puede combinar
/// con regex custom adicionales.
pub fn preset_dni_peruano() -> CompiledPattern {
    CompiledPattern {
        label: "DNI peruano".into(),
        // 8 digitos delimitados por word boundaries. Evita capturar
        // numeros mas largos como 12345678901.
        regex: Regex::new(r"\b\d{8}\b").expect("regex DNI valida"),
    }
}

pub fn preset_telefono_peruano() -> CompiledPattern {
    CompiledPattern {
        label: "Telefono peruano".into(),
        // Celular 9XXXXXXXX, fijo Lima (01)XXXXXXX, o fijo Lima 01-XXXXXXX.
        // El `\b` no funciona antes de `(` porque `(` es non-word, asi que
        // cada alternativa tiene su propia delimitacion.
        regex: Regex::new(
            r"(?:\b9\d{8}\b|\(0?1\)[\s-]?\d{6,7}|\b01[\s-]\d{6,7}\b)",
        )
        .expect("regex telefono valida"),
    }
}

pub fn preset_email() -> CompiledPattern {
    CompiledPattern {
        label: "Email".into(),
        // Regex pragmatica: NO RFC-completa pero cubre 99% de emails reales.
        regex: Regex::new(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
            .expect("regex email valida"),
    }
}

/// Construye una lista de patrones desde fuentes mixtas (presets opt-in
/// + custom regex).
pub fn build_patterns(
    use_dni: bool,
    use_telefono: bool,
    use_email: bool,
    custom: &[(String, String)],
) -> Result<Vec<CompiledPattern>> {
    let mut patterns = Vec::new();
    if use_dni {
        patterns.push(preset_dni_peruano());
    }
    if use_telefono {
        patterns.push(preset_telefono_peruano());
    }
    if use_email {
        patterns.push(preset_email());
    }
    for (label, raw) in custom {
        let regex = Regex::new(raw).map_err(|e| {
            AppError::InvalidInput(format!(
                "Regex invalida para patron '{}': {}",
                label, e
            ))
        })?;
        patterns.push(CompiledPattern {
            label: label.clone(),
            regex,
        });
    }
    if patterns.is_empty() {
        return Err(AppError::InvalidInput(
            "Selecciona al menos un patron (DNI, telefono, email o custom)".into(),
        ));
    }
    Ok(patterns)
}

/// Escanea el PDF y devuelve la lista de RedactRect a aplicar mas el
/// reporte por patron. NO modifica el archivo; eso lo hace `apply_redactions`.
pub fn scan_for_redactions(
    input: &Path,
    patterns: &[CompiledPattern],
) -> Result<(Vec<RedactRect>, AutoRedactReport)> {
    let pdfium = pdfium()?;
    let document = pdfium
        .load_pdf_from_file(input, None)
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    let mut all_rects: Vec<RedactRect> = Vec::new();
    let mut per_pattern: Vec<PatternHits> = patterns
        .iter()
        .map(|p| PatternHits {
            label: p.label.clone(),
            matches: 0,
            pages_with_hits: Vec::new(),
        })
        .collect();

    for (page_idx, page) in document.pages().iter().enumerate() {
        let page_index = page_idx as u16;
        let text_page = match page.text() {
            Ok(t) => t,
            Err(_) => continue,
        };

        // Recolectar (char, bounds) en orden. Saltamos chars sin unicode
        // (suelen ser separadores invisibles).
        let mut text = String::new();
        let mut bounds: Vec<Option<PdfRect>> = Vec::new();
        for ch in text_page.chars().iter() {
            if let Some(c) = ch.unicode_char() {
                text.push(c);
                bounds.push(ch.loose_bounds().ok());
            }
        }

        if text.is_empty() {
            continue;
        }

        // Mapeo char-index -> byte-index para que los matches del regex
        // (que devuelve byte-offsets) se traduzcan a indices de chars.
        // Construimos un Vec<usize> con el byte-offset de cada char.
        let char_byte_offsets: Vec<usize> = text.char_indices().map(|(b, _)| b).collect();
        let byte_to_char = |byte_idx: usize| -> usize {
            // Posicion del primer char cuyo byte_offset >= byte_idx.
            char_byte_offsets
                .binary_search(&byte_idx)
                .unwrap_or_else(|insert| insert.saturating_sub(0))
        };

        for (pattern_idx, pattern) in patterns.iter().enumerate() {
            let mut hits_this_page = 0usize;
            for m in pattern.regex.find_iter(&text) {
                let start_char = byte_to_char(m.start());
                let end_char = byte_to_char(m.end()).min(bounds.len());
                if start_char >= end_char {
                    continue;
                }

                // Union de bounds de chars [start..end). Skip chars sin bounds.
                let mut left = f32::INFINITY;
                let mut right = f32::NEG_INFINITY;
                let mut bottom = f32::INFINITY;
                let mut top = f32::NEG_INFINITY;
                let mut any = false;
                for b in bounds[start_char..end_char].iter().flatten() {
                    let l = b.left().value;
                    let r = b.right().value;
                    let bo = b.bottom().value;
                    let to = b.top().value;
                    if l < left {
                        left = l;
                    }
                    if r > right {
                        right = r;
                    }
                    if bo < bottom {
                        bottom = bo;
                    }
                    if to > top {
                        top = to;
                    }
                    any = true;
                }
                if !any {
                    continue;
                }

                all_rects.push(RedactRect {
                    page: page_index,
                    bottom,
                    left,
                    top,
                    right,
                });
                hits_this_page += 1;
            }
            if hits_this_page > 0 {
                let p = &mut per_pattern[pattern_idx];
                p.matches += hits_this_page;
                if !p.pages_with_hits.contains(&page_index) {
                    p.pages_with_hits.push(page_index);
                }
            }
        }
    }

    let report = AutoRedactReport {
        total_redactions: all_rects.len(),
        per_pattern,
    };
    Ok((all_rects, report))
}

/// Pipeline completo: escanea, aplica los rects y guarda en `output`.
pub fn auto_redact(
    input: &Path,
    output: &Path,
    patterns: &[CompiledPattern],
) -> Result<AutoRedactReport> {
    let (rects, report) = scan_for_redactions(input, patterns)?;
    if rects.is_empty() {
        // Aun asi guardamos copia identica para que el llamador tenga el archivo
        // de salida. Mejor que no escribir nada y confundir al usuario.
        std::fs::copy(input, output).map_err(|e| AppError::Io(e.to_string()))?;
    } else {
        apply_redactions(input, output, &rects)?;
    }
    Ok(report)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dni_regex_matchea_8_digitos_solos() {
        let p = preset_dni_peruano();
        assert!(p.regex.is_match("Mi DNI es 12345678."));
        assert!(p.regex.is_match("DNI: 87654321"));
        // No debe matchear 7 ni 9 digitos
        assert!(!p.regex.is_match("solo 1234567 digitos"));
        assert!(!p.regex.is_match("123456789"));
    }

    #[test]
    fn telefono_regex_matchea_celular_y_lima() {
        let p = preset_telefono_peruano();
        assert!(p.regex.is_match("Mi celular 987654321"));
        assert!(p.regex.is_match("Llamame al (01) 4441234"));
        assert!(p.regex.is_match("01-4441234"));
        // 7 u 8 digitos sin prefijo no deben matchear
        assert!(!p.regex.is_match("solo 1234567"));
    }

    #[test]
    fn email_regex_matchea_formatos_basicos() {
        let p = preset_email();
        assert!(p.regex.is_match("escribeme a alfredo@neumologia.pe"));
        assert!(p.regex.is_match("user.name+tag@example.co.uk"));
        assert!(!p.regex.is_match("no-arroba aqui"));
    }

    #[test]
    fn build_patterns_falla_sin_seleccion() {
        let r = build_patterns(false, false, false, &[]);
        assert!(r.is_err(), "debe exigir al menos un patron");
    }

    #[test]
    fn build_patterns_acepta_custom_valido() {
        let r = build_patterns(
            false,
            false,
            false,
            &[("HC-num".into(), r"HC-\d+".into())],
        );
        assert!(r.is_ok());
        let pats = r.unwrap();
        assert_eq!(pats.len(), 1);
        assert_eq!(pats[0].label, "HC-num");
    }

    #[test]
    fn build_patterns_falla_con_custom_invalido() {
        let r = build_patterns(false, false, false, &[("bad".into(), "[unbalanced".into())]);
        assert!(r.is_err());
    }
}
