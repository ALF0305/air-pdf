//! Sanitiza un PDF removiendo elementos potencialmente peligrosos o
//! intrusivos que puede traer un documento de terceros.
//!
//! Categorias eliminadas (configurables):
//!
//! - **JavaScript**: scripts ejecutables embebidos. Pueden hacer fetch de
//!   recursos externos, ejecutar acciones al abrir, mostrar dialogs.
//!   PDFs de origen incierto NO deberian traer JS en flujo clinico.
//! - **EmbeddedFiles**: archivos adjuntos dentro del PDF. Pueden contener
//!   malware o datos no auditados.
//! - **OpenAction / AA (Additional Actions)**: acciones automaticas al
//!   abrir, cerrar, imprimir o navegar. Suelen ser legitimas (jump al
//!   indice) pero tambien usadas por phishing.
//! - **XFA forms**: formularios XML interactivos con scripting. La mayoria
//!   de PDFs modernos NO los usan; muchos visores los ignoran.
//! - **Metadata XMP**: informacion del autor original (creator, producer,
//!   timestamps, software, idioma). Util eliminar al re-publicar
//!   anonimizando.
//!
//! Cada categoria es opt-in por flags. Defaults razonables: todo activo
//! salvo metadata (que puede ser legitima).
//!
//! El archivo de entrada NO se modifica; se escribe un PDF saneado en
//! `output_path`.

use crate::error::{AppError, Result};
use lopdf::{Document, Object};
use std::path::Path;

/// Flags por categoria a sanitizar. Cada `true` significa "remover".
#[derive(Debug, Clone)]
pub struct SanitizeOptions {
    pub remove_javascript: bool,
    pub remove_embedded_files: bool,
    pub remove_open_actions: bool,
    pub remove_xfa: bool,
    pub remove_metadata: bool,
}

impl Default for SanitizeOptions {
    fn default() -> Self {
        Self {
            remove_javascript: true,
            remove_embedded_files: true,
            remove_open_actions: true,
            remove_xfa: true,
            // Metadata por defecto se preserva. El usuario puede ser
            // legitimo autor del documento y querer conservar su info.
            remove_metadata: false,
        }
    }
}

/// Reporte de lo eliminado durante la sanitizacion. Util para mostrar al
/// usuario un resumen "antes / despues".
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct SanitizeReport {
    pub javascript_removed: bool,
    pub embedded_files_removed: bool,
    pub open_action_removed: bool,
    pub catalog_aa_removed: bool,
    /// Numero de paginas de las que se removio AA o JS de pagina.
    pub pages_actions_removed: usize,
    pub xfa_removed: bool,
    pub metadata_removed: bool,
}

/// Sanitiza el PDF en `input_path` y escribe el resultado en `output_path`.
pub fn sanitize_pdf<P: AsRef<Path>, Q: AsRef<Path>>(
    input_path: P,
    output_path: Q,
    options: SanitizeOptions,
) -> Result<SanitizeReport> {
    let mut doc = Document::load(input_path.as_ref())
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    let catalog_id = doc
        .trailer
        .get(b"Root")
        .and_then(Object::as_reference)
        .map_err(|e| AppError::Pdf(format!("PDF sin catalogo Root: {}", e)))?;

    let mut report = SanitizeReport::default();

    // Recolectar IDs de subobjetos referenciados ANTES de pedir mut borrow
    // del catalog. Tanto /Names como /AcroForm pueden ser inline (dict)
    // o referencia indirecta. Si son referencia, los modificamos en su
    // propio object mut borrow despues del bloque del catalog.
    let (names_ref_id, acroform_ref_id) = {
        let catalog = doc
            .get_object(catalog_id)
            .and_then(|o| o.as_dict())
            .map_err(|e| AppError::Pdf(format!("Catalogo invalido: {}", e)))?;
        (
            catalog.get(b"Names").ok().and_then(|o| match o {
                Object::Reference(id) => Some(*id),
                _ => None,
            }),
            catalog.get(b"AcroForm").ok().and_then(|o| match o {
                Object::Reference(id) => Some(*id),
                _ => None,
            }),
        )
    };

    // Operaciones sobre el catalog (entradas inline)
    {
        let catalog = doc
            .get_object_mut(catalog_id)
            .and_then(|o| o.as_dict_mut())
            .map_err(|e| AppError::Pdf(format!("Catalogo invalido: {}", e)))?;

        if options.remove_open_actions {
            if catalog.has(b"OpenAction") {
                catalog.remove(b"OpenAction");
                report.open_action_removed = true;
            }
            if catalog.has(b"AA") {
                catalog.remove(b"AA");
                report.catalog_aa_removed = true;
            }
        }

        if options.remove_metadata && catalog.has(b"Metadata") {
            catalog.remove(b"Metadata");
            report.metadata_removed = true;
        }

        // AcroForm inline: si el catalog tiene /AcroForm como dict directo
        // y no como referencia, quitamos su /XFA aqui.
        if options.remove_xfa && acroform_ref_id.is_none() {
            if let Ok(acroform) = catalog
                .get_mut(b"AcroForm")
                .and_then(|o| o.as_dict_mut())
            {
                if acroform.has(b"XFA") {
                    acroform.remove(b"XFA");
                    report.xfa_removed = true;
                }
            }
        }

        // Names inline: si el subtree esta inline en el catalog,
        // limpiamos aqui. Si es referencia, se hace mas abajo.
        if (options.remove_javascript || options.remove_embedded_files)
            && names_ref_id.is_none()
        {
            if let Ok(names) = catalog.get_mut(b"Names").and_then(|o| o.as_dict_mut()) {
                if options.remove_javascript && names.has(b"JavaScript") {
                    names.remove(b"JavaScript");
                    report.javascript_removed = true;
                }
                if options.remove_embedded_files && names.has(b"EmbeddedFiles") {
                    names.remove(b"EmbeddedFiles");
                    report.embedded_files_removed = true;
                }
            }
        }
    }

    // Names como referencia indirecta: ahora si podemos mut borrow
    if let Some(names_id) = names_ref_id {
        if options.remove_javascript || options.remove_embedded_files {
            if let Ok(names) = doc
                .get_object_mut(names_id)
                .and_then(|o| o.as_dict_mut())
            {
                if options.remove_javascript && names.has(b"JavaScript") {
                    names.remove(b"JavaScript");
                    report.javascript_removed = true;
                }
                if options.remove_embedded_files && names.has(b"EmbeddedFiles") {
                    names.remove(b"EmbeddedFiles");
                    report.embedded_files_removed = true;
                }
            }
        }
    }

    // AcroForm como referencia indirecta: limpiar /XFA
    if let Some(acroform_id) = acroform_ref_id {
        if options.remove_xfa {
            if let Ok(acroform) = doc
                .get_object_mut(acroform_id)
                .and_then(|o| o.as_dict_mut())
            {
                if acroform.has(b"XFA") {
                    acroform.remove(b"XFA");
                    report.xfa_removed = true;
                }
            }
        }
    }

    // Operaciones por pagina: limpiar /AA (additional actions) y /JS de
    // cada Page object.
    if options.remove_open_actions || options.remove_javascript {
        let page_ids: Vec<lopdf::ObjectId> = doc.get_pages().values().copied().collect();

        for page_id in page_ids {
            if let Ok(page) = doc
                .get_object_mut(page_id)
                .and_then(|o| o.as_dict_mut())
            {
                let mut changed = false;

                if options.remove_open_actions && page.has(b"AA") {
                    page.remove(b"AA");
                    changed = true;
                }
                if options.remove_javascript && page.has(b"JS") {
                    page.remove(b"JS");
                    changed = true;
                }
                // /A en pagina (link action al abrir) tambien es accion.
                if options.remove_open_actions && page.has(b"A") {
                    page.remove(b"A");
                    changed = true;
                }

                if changed {
                    report.pages_actions_removed += 1;
                }
            }
        }
    }

    doc.save(output_path.as_ref())
        .map_err(|e| AppError::Io(e.to_string()))?;

    Ok(report)
}

#[cfg(test)]
mod tests {
    use super::*;
    use lopdf::dictionary;
    use std::fs;

    fn tempdir_for_test(tag: &str) -> std::path::PathBuf {
        let mut dir = std::env::temp_dir();
        dir.push(format!("airpdf-sanitize-test-{}-{}", tag, std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("debe crear tempdir");
        dir
    }

    /// Crea un PDF minimo con catalogo conteniendo OpenAction, /AA y un
    /// subtree Names con /JavaScript y /EmbeddedFiles. Asi podemos
    /// verificar que sanitize remueve cada uno.
    fn write_pdf_with_dangerous_features(path: &Path) {
        let mut doc = Document::with_version("1.7");

        let pages_id = doc.new_object_id();

        let page_id = doc.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "MediaBox" => vec![0.into(), 0.into(), 612.into(), 792.into()],
            // Pagina con AA y JS, ambos peligrosos
            "AA" => dictionary! {
                "O" => dictionary! { "S" => "JavaScript", "JS" => "app.alert('hola')" },
            },
            "JS" => "console.println('test')",
        });

        doc.objects.insert(pages_id, Object::Dictionary(dictionary! {
            "Type" => "Pages",
            "Count" => 1,
            "Kids" => vec![Object::Reference(page_id)],
        }));

        // Subtree Names con JavaScript y EmbeddedFiles
        let names_id = doc.add_object(dictionary! {
            "JavaScript" => dictionary! {
                "Names" => Object::Array(vec![
                    Object::String(b"main".to_vec(), lopdf::StringFormat::Literal),
                ]),
            },
            "EmbeddedFiles" => dictionary! {
                "Names" => Object::Array(vec![
                    Object::String(b"file1".to_vec(), lopdf::StringFormat::Literal),
                ]),
            },
        });

        let catalog_id = doc.add_object(dictionary! {
            "Type" => "Catalog",
            "Pages" => pages_id,
            "OpenAction" => dictionary! {
                "S" => "JavaScript",
                "JS" => "app.alert('peligroso')",
            },
            "AA" => dictionary! {
                "WC" => dictionary! { "S" => "JavaScript", "JS" => "x" },
            },
            "Names" => names_id,
        });
        doc.trailer.set("Root", catalog_id);

        doc.save(path).expect("debe guardar PDF de prueba");
    }

    fn write_pdf_with_xfa(path: &Path) {
        let mut doc = Document::with_version("1.7");
        let pages_id = doc.new_object_id();
        let page_id = doc.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "MediaBox" => vec![0.into(), 0.into(), 612.into(), 792.into()],
        });
        doc.objects.insert(pages_id, Object::Dictionary(dictionary! {
            "Type" => "Pages",
            "Count" => 1,
            "Kids" => vec![Object::Reference(page_id)],
        }));

        let catalog_id = doc.add_object(dictionary! {
            "Type" => "Catalog",
            "Pages" => pages_id,
            "AcroForm" => dictionary! {
                "Fields" => Object::Array(vec![]),
                "XFA" => Object::String(
                    b"<xfa>...</xfa>".to_vec(),
                    lopdf::StringFormat::Literal,
                ),
            },
        });
        doc.trailer.set("Root", catalog_id);
        doc.save(path).expect("debe guardar");
    }

    fn count_dangerous_features(path: &Path) -> (bool, bool, bool, bool, bool) {
        let doc = Document::load(path).expect("load");
        let cat_id = doc
            .trailer
            .get(b"Root")
            .and_then(Object::as_reference)
            .unwrap();
        let cat = doc.get_object(cat_id).unwrap().as_dict().unwrap();

        let has_open_action = cat.has(b"OpenAction");
        let has_aa = cat.has(b"AA");

        let mut has_js = false;
        let mut has_embedded = false;
        if let Ok(names) = cat.get(b"Names").and_then(|o| {
            // Names puede ser referencia o dict inline
            match o {
                Object::Reference(id) => doc.get_object(*id).and_then(|o| o.as_dict()),
                Object::Dictionary(_) => o.as_dict(),
                _ => Err(lopdf::Error::Type),
            }
        }) {
            has_js = names.has(b"JavaScript");
            has_embedded = names.has(b"EmbeddedFiles");
        }

        let has_xfa = cat
            .get(b"AcroForm")
            .and_then(|o| match o {
                Object::Reference(id) => doc.get_object(*id).and_then(|o| o.as_dict()),
                Object::Dictionary(_) => o.as_dict(),
                _ => Err(lopdf::Error::Type),
            })
            .map(|af| af.has(b"XFA"))
            .unwrap_or(false);

        (has_open_action, has_aa, has_js, has_embedded, has_xfa)
    }

    #[test]
    fn defaults_remueven_javascript_embedded_y_acciones() {
        let dir = tempdir_for_test("defaults");
        let inp = dir.join("dirty.pdf");
        let out = dir.join("clean.pdf");
        write_pdf_with_dangerous_features(&inp);

        // Antes: todo presente
        let (oa, aa, js, ef, _xfa) = count_dangerous_features(&inp);
        assert!(oa && aa && js && ef, "fixture debe tener todo: {:?}", (oa, aa, js, ef));

        let report = sanitize_pdf(&inp, &out, SanitizeOptions::default()).expect("sanitize");

        assert!(report.open_action_removed);
        assert!(report.catalog_aa_removed);
        assert!(report.javascript_removed);
        assert!(report.embedded_files_removed);
        assert!(report.pages_actions_removed >= 1);

        // Despues: nada peligroso queda en catalog/Names
        let (oa, aa, js, ef, _xfa) = count_dangerous_features(&out);
        assert!(!oa && !aa && !js && !ef, "deberia quedar limpio: {:?}", (oa, aa, js, ef));

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn opt_out_preserva_categorias() {
        let dir = tempdir_for_test("optout");
        let inp = dir.join("dirty.pdf");
        let out = dir.join("partial.pdf");
        write_pdf_with_dangerous_features(&inp);

        // Solo removemos JS, dejamos el resto
        let opts = SanitizeOptions {
            remove_javascript: true,
            remove_embedded_files: false,
            remove_open_actions: false,
            remove_xfa: false,
            remove_metadata: false,
        };
        let report = sanitize_pdf(&inp, &out, opts).expect("sanitize");

        assert!(report.javascript_removed);
        assert!(!report.open_action_removed);
        assert!(!report.embedded_files_removed);

        let (oa, aa, js, ef, _xfa) = count_dangerous_features(&out);
        // OpenAction y EmbeddedFiles deben seguir; JS debe haberse ido
        assert!(oa, "OpenAction debe preservarse");
        assert!(aa, "AA del catalog debe preservarse");
        assert!(!js, "JS debe haberse removido");
        assert!(ef, "EmbeddedFiles debe preservarse");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn xfa_se_remueve_pero_acroform_se_preserva() {
        let dir = tempdir_for_test("xfa");
        let inp = dir.join("with-xfa.pdf");
        let out = dir.join("no-xfa.pdf");
        write_pdf_with_xfa(&inp);

        let (_, _, _, _, xfa_before) = count_dangerous_features(&inp);
        assert!(xfa_before, "fixture debe traer XFA");

        let opts = SanitizeOptions {
            remove_javascript: false,
            remove_embedded_files: false,
            remove_open_actions: false,
            remove_xfa: true,
            remove_metadata: false,
        };
        let report = sanitize_pdf(&inp, &out, opts).expect("sanitize");
        assert!(report.xfa_removed);

        let (_, _, _, _, xfa_after) = count_dangerous_features(&out);
        assert!(!xfa_after, "XFA debe haberse removido");

        // El AcroForm en si debe seguir existiendo (tenia /Fields)
        let doc = Document::load(&out).expect("load");
        let cat_id = doc
            .trailer
            .get(b"Root")
            .and_then(Object::as_reference)
            .unwrap();
        let cat = doc.get_object(cat_id).unwrap().as_dict().unwrap();
        assert!(cat.has(b"AcroForm"), "AcroForm debe preservarse");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn pdf_sin_features_peligrosas_no_lanza_error() {
        let dir = tempdir_for_test("clean");
        let inp = dir.join("plain.pdf");
        let out = dir.join("plain-out.pdf");

        // PDF minimo sin nada peligroso
        let mut doc = Document::with_version("1.7");
        let pages_id = doc.new_object_id();
        let page_id = doc.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "MediaBox" => vec![0.into(), 0.into(), 612.into(), 792.into()],
        });
        doc.objects.insert(pages_id, Object::Dictionary(dictionary! {
            "Type" => "Pages",
            "Count" => 1,
            "Kids" => vec![Object::Reference(page_id)],
        }));
        let cat_id = doc.add_object(dictionary! {
            "Type" => "Catalog",
            "Pages" => pages_id,
        });
        doc.trailer.set("Root", cat_id);
        doc.save(&inp).expect("save");

        let report = sanitize_pdf(&inp, &out, SanitizeOptions::default()).expect("sanitize");
        // Nada removido pero tampoco panic
        assert!(!report.open_action_removed);
        assert!(!report.javascript_removed);
        assert!(!report.embedded_files_removed);
        assert_eq!(report.pages_actions_removed, 0);

        let _ = fs::remove_dir_all(&dir);
    }
}
