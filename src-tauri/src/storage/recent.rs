// Recent files list (last 20) persisted to %APPDATA%/AirPDF/recent.json
use crate::error::{AppError, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

const MAX_RECENT: usize = 20;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentFile {
    pub path: String,
    pub last_opened: String,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct RecentList {
    pub files: Vec<RecentFile>,
}

fn recent_file_path() -> Result<PathBuf> {
    let dir = dirs::data_dir()
        .ok_or_else(|| AppError::Storage("Cannot find data dir".into()))?
        .join("AirPDF");
    std::fs::create_dir_all(&dir)?;
    Ok(dir.join("recent.json"))
}

pub fn load() -> Result<RecentList> {
    let path = recent_file_path()?;
    if !path.exists() {
        return Ok(RecentList::default());
    }
    let content = std::fs::read_to_string(&path)?;
    serde_json::from_str(&content)
        .map_err(|e| AppError::Storage(format!("Parse recent.json: {}", e)))
}

pub fn save(list: &RecentList) -> Result<()> {
    let path = recent_file_path()?;
    let content = serde_json::to_string_pretty(list)
        .map_err(|e| AppError::Storage(e.to_string()))?;
    std::fs::write(&path, content)?;
    Ok(())
}

pub fn add(path: String) -> Result<()> {
    let mut list = load()?;
    list.files.retain(|f| f.path != path);
    list.files.insert(
        0,
        RecentFile {
            path,
            last_opened: chrono::Utc::now().to_rfc3339(),
        },
    );
    list.files.truncate(MAX_RECENT);
    save(&list)
}

pub fn clear() -> Result<()> {
    save(&RecentList::default())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_does_not_panic() {
        let _ = load();
    }

    #[test]
    fn test_dedup_and_sort_logic() {
        let mut list = RecentList {
            files: vec![
                RecentFile {
                    path: "C:/a.pdf".into(),
                    last_opened: "2026-04-18T10:00:00Z".into(),
                },
                RecentFile {
                    path: "C:/b.pdf".into(),
                    last_opened: "2026-04-18T11:00:00Z".into(),
                },
            ],
        };
        list.files.retain(|f| f.path != "C:/a.pdf");
        list.files.insert(
            0,
            RecentFile {
                path: "C:/a.pdf".into(),
                last_opened: "2026-04-18T12:00:00Z".into(),
            },
        );
        assert_eq!(list.files.len(), 2);
        assert_eq!(list.files[0].path, "C:/a.pdf");
    }

    #[test]
    fn test_max_recent_truncate() {
        let mut list = RecentList::default();
        for i in 0..25 {
            list.files.push(RecentFile {
                path: format!("C:/file{}.pdf", i),
                last_opened: chrono::Utc::now().to_rfc3339(),
            });
        }
        list.files.truncate(MAX_RECENT);
        assert_eq!(list.files.len(), MAX_RECENT);
    }
}
