// Version history (last 10 per PDF) in %APPDATA%/AirPDF/versions/<stem>/
use crate::error::Result;
use std::path::{Path, PathBuf};

const MAX_VERSIONS: usize = 10;

pub fn versions_dir(pdf_path: &Path) -> Result<PathBuf> {
    let stem = pdf_path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".into());
    let dir = dirs::data_dir()
        .ok_or_else(|| crate::error::AppError::Storage("No data dir".into()))?
        .join("AirPDF")
        .join("versions")
        .join(stem);
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

/// Save a snapshot of the PDF to the versions directory.
pub fn save_version(pdf_path: &Path) -> Result<PathBuf> {
    let dir = versions_dir(pdf_path)?;
    let timestamp = chrono::Utc::now().format("%Y%m%d-%H%M%S");
    let target = dir.join(format!("{}.pdf", timestamp));
    std::fs::copy(pdf_path, &target)?;
    rotate_versions(&dir)?;
    Ok(target)
}

fn rotate_versions(dir: &Path) -> Result<()> {
    let mut entries: Vec<_> = std::fs::read_dir(dir)?.filter_map(|e| e.ok()).collect();
    entries.sort_by_key(|e| e.file_name());
    while entries.len() > MAX_VERSIONS {
        let oldest = entries.remove(0);
        std::fs::remove_file(oldest.path()).ok();
    }
    Ok(())
}

pub fn list_versions(pdf_path: &Path) -> Result<Vec<PathBuf>> {
    let dir = versions_dir(pdf_path)?;
    let mut versions: Vec<PathBuf> = std::fs::read_dir(&dir)?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .collect();
    versions.sort();
    versions.reverse();
    Ok(versions)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_versions_dir_creates_under_appdata() {
        let p = Path::new("C:/test.pdf");
        let result = versions_dir(p);
        assert!(result.is_ok());
    }

    #[test]
    fn test_rotate_truncates_to_max_versions() {
        let tmp = std::env::temp_dir().join("airpdf_rotate_test");
        std::fs::create_dir_all(&tmp).ok();
        for i in 0..15 {
            std::fs::write(tmp.join(format!("v{:03}.pdf", i)), b"dummy").ok();
        }
        rotate_versions(&tmp).ok();
        let count = std::fs::read_dir(&tmp).map(|d| d.count()).unwrap_or(0);
        assert!(count <= MAX_VERSIONS);
        std::fs::remove_dir_all(&tmp).ok();
    }
}
