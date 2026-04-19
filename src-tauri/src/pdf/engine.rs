// PDFium wrapper singleton using OnceCell + Mutex for thread safety.
// pdfium-render Pdfium is !Send + !Sync by design, so we wrap it in
// a Mutex to make it accessible from any thread (one-at-a-time access).
use crate::error::{AppError, Result};
use once_cell::sync::OnceCell;
use pdfium_render::prelude::*;
use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard};

static PDFIUM: OnceCell<Mutex<Pdfium>> = OnceCell::new();

/// Build candidate paths where pdfium.dll might live.
/// Search order:
/// 1. Directory of the running executable (installed location)
/// 2. exe_dir/resources/pdfium/bin/ (Tauri bundled resource path)
/// 3. exe_dir/resources/_up_/pdfium/bin/ (alt Tauri path)
/// 4. exe_dir/../pdfium/bin/ (dev target/debug layout)
/// 5. CARGO_MANIFEST_DIR/pdfium/bin/ (dev cargo test layout)
/// 6. Current working directory
/// 7. System library
fn candidate_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();

    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            paths.push(dir.to_path_buf());
            paths.push(dir.join("resources").join("pdfium").join("bin"));
            paths.push(dir.join("resources").join("_up_").join("pdfium").join("bin"));
            paths.push(dir.join("..").join("pdfium").join("bin"));
            if let Some(parent) = dir.parent() {
                paths.push(parent.to_path_buf());
                paths.push(parent.join("pdfium").join("bin"));
            }
        }
    }

    // Dev mode fallback: cargo test runs from src-tauri
    let manifest = option_env!("CARGO_MANIFEST_DIR").unwrap_or("");
    if !manifest.is_empty() {
        paths.push(PathBuf::from(manifest).join("pdfium").join("bin"));
        paths.push(PathBuf::from(manifest).join("target").join("debug"));
        paths.push(PathBuf::from(manifest).join("target").join("release"));
    }

    paths.push(PathBuf::from("."));
    paths.push(PathBuf::from(".."));

    paths
}

/// Initialize PDFium. Tries multiple candidate directories before falling back
/// to system library lookup.
pub fn init() -> Result<()> {
    if PDFIUM.get().is_some() {
        return Ok(());
    }

    let mut last_err: Option<String> = None;
    let mut bindings_opt: Option<Box<dyn PdfiumLibraryBindings>> = None;

    for path in candidate_paths() {
        let path_str = path.to_string_lossy().to_string();
        let lib_name = Pdfium::pdfium_platform_library_name_at_path(&path_str);
        match Pdfium::bind_to_library(&lib_name) {
            Ok(b) => {
                eprintln!("[AirPDF] PDFium loaded from: {}", lib_name.display());
                bindings_opt = Some(b);
                break;
            }
            Err(e) => {
                last_err = Some(format!("{} ({})", path_str, e));
            }
        }
    }

    let bindings = match bindings_opt {
        Some(b) => b,
        None => match Pdfium::bind_to_system_library() {
            Ok(b) => {
                eprintln!("[AirPDF] PDFium loaded from system library");
                b
            }
            Err(e) => {
                return Err(AppError::Pdf(format!(
                    "PDFium load failed. Last error: {}. System lib error: {}",
                    last_err.unwrap_or_else(|| "no candidates tried".into()),
                    e
                )));
            }
        },
    };

    let pdfium = Pdfium::new(bindings);
    PDFIUM
        .set(Mutex::new(pdfium))
        .map_err(|_| AppError::Pdf("PDFium already initialized".into()))?;
    Ok(())
}

/// Get a lock on the PDFium instance. If PDFium wasn't initialized yet,
/// attempts to lazily initialize it (handles the case where early init
/// failed but we still want to retry on first use).
pub fn pdfium() -> Result<MutexGuard<'static, Pdfium>> {
    if PDFIUM.get().is_none() {
        // Try lazy init
        init()?;
    }
    let cell = PDFIUM
        .get()
        .ok_or_else(|| AppError::Pdf("PDFium not initialized. Call init() first.".into()))?;
    cell.lock()
        .map_err(|e| AppError::Pdf(format!("PDFium mutex poisoned: {}", e)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pdfium_initializes() {
        let result = init();
        assert!(result.is_ok(), "PDFium should initialize: {:?}", result);
    }

    #[test]
    fn test_pdfium_accessible_after_init() {
        let _ = init();
        assert!(pdfium().is_ok());
    }

    #[test]
    fn test_pdfium_init_is_idempotent() {
        let _ = init();
        let second = init();
        assert!(second.is_ok(), "Second init should not fail");
    }
}
