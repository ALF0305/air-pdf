// PDFium wrapper singleton using OnceCell + Mutex for thread safety.
// pdfium-render v0.8 Pdfium is !Send + !Sync by design, so we wrap it in
// a Mutex to make it accessible from any thread (one-at-a-time access).
use crate::error::{AppError, Result};
use once_cell::sync::OnceCell;
use pdfium_render::prelude::*;
use std::sync::{Mutex, MutexGuard};

static PDFIUM: OnceCell<Mutex<Pdfium>> = OnceCell::new();

/// Initialize PDFium. Attempts to load pdfium.dll from:
/// 1. Current directory (`./pdfium.dll`)
/// 2. Parent directory (`../pdfium.dll`) - dev mode fallback
/// 3. System library (last resort)
pub fn init() -> Result<()> {
    if PDFIUM.get().is_some() {
        return Ok(());
    }

    let bindings = Pdfium::bind_to_library(Pdfium::pdfium_platform_library_name_at_path("./"))
        .or_else(|_| {
            Pdfium::bind_to_library(Pdfium::pdfium_platform_library_name_at_path("../"))
        })
        .or_else(|_| Pdfium::bind_to_system_library())
        .map_err(|e| AppError::Pdf(format!("PDFium load failed: {}", e)))?;

    let pdfium = Pdfium::new(bindings);
    PDFIUM
        .set(Mutex::new(pdfium))
        .map_err(|_| AppError::Pdf("PDFium already initialized".into()))?;
    Ok(())
}

/// Get a lock on the PDFium instance. Blocks if another operation is using it.
pub fn pdfium() -> Result<MutexGuard<'static, Pdfium>> {
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
