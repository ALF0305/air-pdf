// Annotation CRUD Tauri commands
use crate::pdf::editor;
use crate::storage::sidecar::{self, Annotation, Sidecar};
use std::path::PathBuf;

#[tauri::command]
pub async fn annotations_load(pdf_path: String) -> Result<Sidecar, String> {
    sidecar::load(&PathBuf::from(pdf_path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn annotations_save(
    pdf_path: String,
    sidecar: Sidecar,
) -> Result<(), String> {
    let mut s = sidecar;
    crate::storage::sidecar::save(&PathBuf::from(pdf_path), &mut s).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn annotation_add(
    pdf_path: String,
    annotation: Annotation,
) -> Result<Sidecar, String> {
    let path = PathBuf::from(&pdf_path);
    let mut s = sidecar::load(&path).map_err(|e| e.to_string())?;
    s.annotations.push(annotation);
    sidecar::save(&path, &mut s).map_err(|e| e.to_string())?;
    Ok(s)
}

#[tauri::command]
pub async fn annotation_update(
    pdf_path: String,
    annotation: Annotation,
) -> Result<Sidecar, String> {
    let path = PathBuf::from(&pdf_path);
    let mut s = sidecar::load(&path).map_err(|e| e.to_string())?;
    if let Some(idx) = s.annotations.iter().position(|a| a.id == annotation.id) {
        s.annotations[idx] = annotation;
    } else {
        s.annotations.push(annotation);
    }
    sidecar::save(&path, &mut s).map_err(|e| e.to_string())?;
    Ok(s)
}

#[tauri::command]
pub async fn annotation_delete(
    pdf_path: String,
    annotation_id: String,
) -> Result<Sidecar, String> {
    let path = PathBuf::from(&pdf_path);
    let mut s = sidecar::load(&path).map_err(|e| e.to_string())?;
    s.annotations.retain(|a| a.id != annotation_id);
    sidecar::save(&path, &mut s).map_err(|e| e.to_string())?;
    Ok(s)
}

#[tauri::command]
pub async fn annotations_clear(pdf_path: String) -> Result<Sidecar, String> {
    let path = PathBuf::from(&pdf_path);
    let mut s = sidecar::load(&path).map_err(|e| e.to_string())?;
    s.annotations.clear();
    sidecar::save(&path, &mut s).map_err(|e| e.to_string())?;
    Ok(s)
}

#[tauri::command]
pub async fn annotations_embed_into_pdf(
    pdf_path: String,
    output_path: String,
) -> Result<(), String> {
    let pdf = PathBuf::from(&pdf_path);
    let output = PathBuf::from(&output_path);
    let sidecar = sidecar::load(&pdf).map_err(|e| e.to_string())?;
    editor::embed_annotations_into_pdf(&pdf, &output, &sidecar).map_err(|e| e.to_string())
}
