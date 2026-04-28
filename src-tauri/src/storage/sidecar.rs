// Annotations sidecar .airpdf.json I/O
use crate::error::{AppError, Result};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Annotation {
    pub id: String,
    #[serde(rename = "type")]
    pub annotation_type: String,
    pub page: u16,
    pub rect: [f32; 4],
    pub color: String,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub text: Option<String>,
    #[serde(default)]
    pub note: Option<String>,
    pub author: String,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub data: serde_json::Value,
    /// Grosor del trazo en pixeles para anotaciones tipo rect/circle/arrow.
    /// None = usa default 2.
    #[serde(default)]
    pub stroke_width: Option<f32>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnnotationsMetadata {
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub linked_obsidian_note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Sidecar {
    pub version: String,
    pub pdf_hash: String,
    pub created_at: String,
    pub updated_at: String,
    pub annotations: Vec<Annotation>,
    #[serde(default)]
    pub bookmarks_custom: Vec<serde_json::Value>,
    #[serde(default)]
    pub metadata: AnnotationsMetadata,
}

/// Compute sidecar path: `foo.pdf` -> `foo.pdf.airpdf.json` (next to the PDF).
pub fn sidecar_path(pdf_path: &Path) -> PathBuf {
    let mut p = pdf_path.to_path_buf();
    let filename = p
        .file_name()
        .map(|f| f.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".into());
    p.set_file_name(format!("{}.airpdf.json", filename));
    p
}

/// SHA256 hash of PDF bytes - used to detect PDF changes.
pub fn compute_hash(pdf_path: &Path) -> Result<String> {
    let bytes = std::fs::read(pdf_path)?;
    let hash = Sha256::digest(&bytes);
    Ok(format!("sha256:{:x}", hash))
}

/// Load sidecar or return empty default if file missing.
pub fn load(pdf_path: &Path) -> Result<Sidecar> {
    let path = sidecar_path(pdf_path);
    if !path.exists() {
        let now = chrono::Utc::now().to_rfc3339();
        return Ok(Sidecar {
            version: "1.0".into(),
            pdf_hash: compute_hash(pdf_path).unwrap_or_default(),
            created_at: now.clone(),
            updated_at: now,
            annotations: Vec::new(),
            bookmarks_custom: Vec::new(),
            metadata: AnnotationsMetadata::default(),
        });
    }
    let content = std::fs::read_to_string(&path)?;
    serde_json::from_str(&content).map_err(|e| AppError::Storage(e.to_string()))
}

/// Save sidecar (updates updated_at).
pub fn save(pdf_path: &Path, sidecar: &mut Sidecar) -> Result<()> {
    sidecar.updated_at = chrono::Utc::now().to_rfc3339();
    let path = sidecar_path(pdf_path);
    let content = serde_json::to_string_pretty(sidecar)
        .map_err(|e| AppError::Storage(e.to_string()))?;
    std::fs::write(&path, content)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sidecar_path_appends_extension() {
        let p = Path::new("C:/docs/paper.pdf");
        let s = sidecar_path(p);
        assert_eq!(s.file_name().unwrap(), "paper.pdf.airpdf.json");
    }

    #[test]
    fn test_load_returns_default_when_missing() {
        let temp = std::env::temp_dir().join("airpdf_test_load.pdf");
        std::fs::write(&temp, b"%PDF-1.4 minimal dummy").unwrap();
        let sidecar = load(&temp).unwrap();
        assert_eq!(sidecar.annotations.len(), 0);
        assert_eq!(sidecar.version, "1.0");
        std::fs::remove_file(&temp).ok();
    }

    #[test]
    fn test_save_and_reload_preserves_annotations() {
        let temp = std::env::temp_dir().join("airpdf_test_save.pdf");
        std::fs::write(&temp, b"%PDF-1.4 minimal dummy").unwrap();
        let mut sidecar = load(&temp).unwrap();
        sidecar.annotations.push(Annotation {
            id: "test-id".into(),
            annotation_type: "highlight".into(),
            page: 0,
            rect: [10.0, 20.0, 100.0, 40.0],
            color: "#FFEB3B".into(),
            category: Some("Importante".into()),
            text: None,
            note: Some("Test note".into()),
            author: "Alfredo".into(),
            created_at: "2026-04-19".into(),
            updated_at: "2026-04-19".into(),
            data: serde_json::Value::Null,
            stroke_width: None,
        });
        save(&temp, &mut sidecar).unwrap();
        let reloaded = load(&temp).unwrap();
        assert_eq!(reloaded.annotations.len(), 1);
        assert_eq!(reloaded.annotations[0].id, "test-id");
        assert_eq!(reloaded.annotations[0].note, Some("Test note".into()));
        std::fs::remove_file(&temp).ok();
        std::fs::remove_file(sidecar_path(&temp)).ok();
    }

    #[test]
    fn test_compute_hash_deterministic() {
        let temp = std::env::temp_dir().join("airpdf_test_hash.pdf");
        std::fs::write(&temp, b"deterministic content").unwrap();
        let h1 = compute_hash(&temp).unwrap();
        let h2 = compute_hash(&temp).unwrap();
        assert_eq!(h1, h2);
        assert!(h1.starts_with("sha256:"));
        std::fs::remove_file(&temp).ok();
    }
}
