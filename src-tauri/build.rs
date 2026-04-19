fn main() {
    // Copy pdfium.dll to target dir for dev/test (Windows only)
    #[cfg(target_os = "windows")]
    {
        let pdfium_src = std::path::Path::new("pdfium/bin/pdfium.dll");
        if pdfium_src.exists() {
            // Copy to multiple possible target locations (debug + release)
            let manifest_dir = std::env::var("CARGO_MANIFEST_DIR")
                .unwrap_or_else(|_| ".".to_string());
            let manifest = std::path::PathBuf::from(&manifest_dir);
            for profile in &["debug", "release"] {
                let target_dir = manifest.join("target").join(profile);
                if target_dir.exists() {
                    let dest = target_dir.join("pdfium.dll");
                    let _ = std::fs::copy(pdfium_src, &dest);
                }
            }
            // Also copy to OUT_DIR ancestor for cargo test runs
            if let Ok(out_dir) = std::env::var("OUT_DIR") {
                let out_path = std::path::PathBuf::from(out_dir);
                if let Some(target_root) = out_path.ancestors().nth(3) {
                    let dest = target_root.join("pdfium.dll");
                    let _ = std::fs::copy(pdfium_src, &dest);
                    let deps = target_root.join("deps");
                    if deps.exists() {
                        let _ = std::fs::copy(pdfium_src, deps.join("pdfium.dll"));
                    }
                }
            }
            println!("cargo:rerun-if-changed=pdfium/bin/pdfium.dll");
        }
    }
    tauri_build::build()
}
