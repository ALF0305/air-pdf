// Settings persisted to %APPDATA%/AirPDF/settings.toml
use crate::error::{AppError, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct GeneralSettings {
    pub default_view_mode: String,
    pub default_zoom: String,
    pub recent_files_limit: u32,
}

impl Default for GeneralSettings {
    fn default() -> Self {
        Self {
            default_view_mode: "single".into(),
            default_zoom: "fit-width".into(),
            recent_files_limit: 20,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AnnotationsSettings {
    pub storage_mode: String,
    pub sync_to_dropbox: bool,
    pub default_author: String,
}

impl Default for AnnotationsSettings {
    fn default() -> Self {
        Self {
            storage_mode: "sidecar".into(),
            sync_to_dropbox: false,
            default_author: "Alfredo".into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AiSettings {
    pub mode: String,
    pub confirm_before_cloud: bool,
}

impl Default for AiSettings {
    fn default() -> Self {
        Self {
            mode: "auto".into(),
            confirm_before_cloud: true,
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    pub general: GeneralSettings,
    pub annotations: AnnotationsSettings,
    pub ai: AiSettings,
}

fn settings_path() -> Result<PathBuf> {
    let dir = dirs::data_dir()
        .ok_or_else(|| AppError::Storage("Cannot find data dir".into()))?
        .join("AirPDF");
    std::fs::create_dir_all(&dir)?;
    Ok(dir.join("settings.toml"))
}

pub fn load() -> Result<Settings> {
    let path = settings_path()?;
    if !path.exists() {
        let defaults = Settings::default();
        save(&defaults)?;
        return Ok(defaults);
    }
    let content = std::fs::read_to_string(&path)?;
    toml::from_str(&content).map_err(|e| AppError::Storage(format!("Parse settings: {}", e)))
}

pub fn save(settings: &Settings) -> Result<()> {
    let path = settings_path()?;
    let content =
        toml::to_string_pretty(settings).map_err(|e| AppError::Storage(e.to_string()))?;
    std::fs::write(&path, content)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_settings_has_expected_values() {
        let s = Settings::default();
        assert_eq!(s.general.default_view_mode, "single");
        assert_eq!(s.general.recent_files_limit, 20);
        assert_eq!(s.annotations.storage_mode, "sidecar");
        assert!(!s.annotations.default_author.is_empty());
        assert_eq!(s.ai.mode, "auto");
        assert!(s.ai.confirm_before_cloud);
    }

    #[test]
    fn test_settings_roundtrip_toml() {
        let s = Settings::default();
        let toml_str = toml::to_string_pretty(&s).unwrap();
        let parsed: Settings = toml::from_str(&toml_str).unwrap();
        assert_eq!(parsed.general.default_view_mode, s.general.default_view_mode);
    }

    #[test]
    fn test_settings_partial_toml_fills_defaults() {
        let partial = r#"
[general]
default_view_mode = "double"
"#;
        let parsed: Settings = toml::from_str(partial).unwrap();
        assert_eq!(parsed.general.default_view_mode, "double");
        assert_eq!(parsed.general.recent_files_limit, 20);
        assert_eq!(parsed.annotations.storage_mode, "sidecar");
    }
}
