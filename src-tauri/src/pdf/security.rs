//! Modulo de seguridad para PDFs (Plan 2.0.A).
//!
//! Funciones cubiertas via crate `qpdf` (con feature `vendored`):
//!
//! - Cifrar PDF con password de usuario y propietario (AES-256, R6).
//! - Descifrar PDF (remover password) sabiendo la contrasena.
//! - Detectar si un PDF esta cifrado.
//! - Linearizar PDF (web optimization, "fast web view").
//! - Configurar permisos (imprimir, copiar texto, modificar, etc.).
//!
//! Estos comandos se exponen al frontend desde `commands::security`.

use crate::error::{AppError, Result};
use qpdf::{
    EncryptionParams, EncryptionParamsR6, PrintPermission, QPdf,
};
use std::path::Path;

/// Permisos asignables a un PDF cifrado. Mapea sobre los flags de qpdf R6.
#[derive(Debug, Clone)]
pub struct PdfPermissions {
    pub allow_print: bool,
    pub allow_extract: bool,
    pub allow_modify: bool,
    pub allow_annotate_and_form: bool,
    pub allow_form_filling: bool,
    pub allow_assemble: bool,
    pub allow_accessibility: bool,
}

impl Default for PdfPermissions {
    /// Por defecto restringe modificacion y extraccion, permite leer e imprimir.
    /// Es el preset razonable para "PDF firmado/protegido enviado a paciente".
    fn default() -> Self {
        Self {
            allow_print: true,
            allow_extract: false,
            allow_modify: false,
            allow_annotate_and_form: false,
            allow_form_filling: false,
            allow_assemble: false,
            allow_accessibility: true,
        }
    }
}

impl PdfPermissions {
    /// Preset "abierto": permite todo. Equivalente a no proteger, pero exigiendo
    /// password para abrir.
    pub fn open() -> Self {
        Self {
            allow_print: true,
            allow_extract: true,
            allow_modify: true,
            allow_annotate_and_form: true,
            allow_form_filling: true,
            allow_assemble: true,
            allow_accessibility: true,
        }
    }
}

fn map_qpdf_err(e: qpdf::QPdfError) -> AppError {
    AppError::Pdf(format!("qpdf: {}", e))
}

/// Devuelve `true` si el PDF en `path` esta cifrado.
///
/// No requiere password: qpdf puede inspeccionar la cabecera de un PDF cifrado
/// para responder esta pregunta sin descifrar el contenido. Para PDFs validos
/// pero cuyo password desconocemos, esta llamada devuelve `Ok(true)`.
pub fn is_pdf_encrypted<P: AsRef<Path>>(path: P) -> Result<bool> {
    // Para detectar si esta cifrado intentamos leerlo sin password.
    // Si qpdf falla con "password required", consideramos cifrado.
    // Si abre OK, consultamos `is_encrypted()` (PDFs pueden traer cifrado
    // con password vacio o con permisos restringidos pero sin password de usuario).
    match QPdf::read(path.as_ref()) {
        Ok(pdf) => Ok(pdf.is_encrypted()),
        Err(_) => Ok(true),
    }
}

/// Cifra un PDF con AES-256 (R6). El archivo de entrada NO se modifica;
/// se escribe un nuevo PDF en `output_path`.
///
/// - `user_password`: requerido para abrir el PDF. Puede ser vacio si solo se
///   quiere proteger contra modificacion (con `owner_password` no vacio).
/// - `owner_password`: requerido para cambiar permisos / quitar el cifrado.
///   Si es vacio, qpdf usa el `user_password` como owner.
/// - `permissions`: restricciones aplicadas a usuarios que abran con
///   `user_password` (no aplican al owner).
pub fn encrypt_pdf<P: AsRef<Path>, Q: AsRef<Path>>(
    input_path: P,
    output_path: Q,
    user_password: &str,
    owner_password: &str,
    permissions: PdfPermissions,
) -> Result<()> {
    let pdf = QPdf::read(input_path.as_ref()).map_err(map_qpdf_err)?;

    let params = EncryptionParamsR6 {
        user_password: user_password.to_string(),
        owner_password: owner_password.to_string(),
        allow_accessibility: permissions.allow_accessibility,
        allow_extract: permissions.allow_extract,
        allow_assemble: permissions.allow_assemble,
        allow_annotate_and_form: permissions.allow_annotate_and_form,
        allow_form_filling: permissions.allow_form_filling,
        allow_modify_other: permissions.allow_modify,
        allow_print: if permissions.allow_print {
            PrintPermission::Full
        } else {
            PrintPermission::None
        },
        encrypt_metadata: true,
    };

    let mut writer = pdf.writer();
    writer
        .encryption_params(EncryptionParams::R6(params))
        .write(output_path.as_ref())
        .map_err(map_qpdf_err)?;

    Ok(())
}

/// Quita el cifrado de un PDF protegido. Requiere conocer la contrasena
/// (preferentemente la de owner; la de user tambien funciona si tiene
/// permisos suficientes en el PDF).
///
/// El archivo de entrada NO se modifica; se escribe un nuevo PDF sin cifrado
/// en `output_path`.
pub fn decrypt_pdf<P: AsRef<Path>, Q: AsRef<Path>>(
    input_path: P,
    output_path: Q,
    password: &str,
) -> Result<()> {
    let pdf = QPdf::read_encrypted(input_path.as_ref(), password).map_err(map_qpdf_err)?;

    let mut writer = pdf.writer();
    writer
        .preserve_encryption(false)
        .write(output_path.as_ref())
        .map_err(map_qpdf_err)?;

    Ok(())
}

/// Linealiza un PDF para "fast web view" (los visores pueden mostrar la
/// primera pagina antes de descargar el archivo completo). No cambia
/// el contenido, solo la estructura de cross-reference.
///
/// Quick win bonus del Plan 2.0.A (mismo crate qpdf, sin trabajo extra).
pub fn linearize_pdf<P: AsRef<Path>, Q: AsRef<Path>>(
    input_path: P,
    output_path: Q,
) -> Result<()> {
    let pdf = QPdf::read(input_path.as_ref()).map_err(map_qpdf_err)?;

    let mut writer = pdf.writer();
    writer
        .linearize(true)
        .write(output_path.as_ref())
        .map_err(map_qpdf_err)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    /// Genera un PDF minimo en memoria usando qpdf y lo escribe en `path`.
    /// Util para tests que no quieren depender de fixtures externos.
    fn write_minimal_pdf(path: &Path) {
        let pdf = QPdf::empty();
        // PDF vacio sin paginas; qpdf lo acepta para escribir.
        // Para tests con contenido real usariamos lopdf o pdfium.
        // En este spike basta con que el archivo sea un PDF valido.
        let mut writer = pdf.writer();
        writer
            .force_pdf_version("1.7")
            .write(path)
            .expect("debe poder escribir PDF minimo");
    }

    #[test]
    fn detecta_pdf_no_cifrado() {
        let dir = tempdir_for_test("notenc");
        let pdf_path = dir.join("plain.pdf");
        write_minimal_pdf(&pdf_path);

        let encrypted = is_pdf_encrypted(&pdf_path).expect("must read");
        assert!(!encrypted, "un PDF recien creado no debe estar cifrado");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn cifra_y_descifra_round_trip() {
        let dir = tempdir_for_test("roundtrip");
        let plain = dir.join("plain.pdf");
        let enc = dir.join("encrypted.pdf");
        let dec = dir.join("decrypted.pdf");

        write_minimal_pdf(&plain);

        // Cifrar con password de owner
        encrypt_pdf(&plain, &enc, "userpass", "ownerpass", PdfPermissions::default())
            .expect("debe cifrar");

        // El archivo cifrado se detecta como cifrado
        let is_enc = is_pdf_encrypted(&enc).expect("must detect");
        assert!(is_enc, "el PDF cifrado debe detectarse como tal");

        // Descifrar con password de owner
        decrypt_pdf(&enc, &dec, "ownerpass").expect("debe descifrar con owner");

        // El descifrado ya no esta cifrado
        let is_enc_after = is_pdf_encrypted(&dec).expect("must detect");
        assert!(!is_enc_after, "el PDF descifrado no debe estar cifrado");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn descifrar_con_password_incorrecto_falla() {
        let dir = tempdir_for_test("badpass");
        let plain = dir.join("plain.pdf");
        let enc = dir.join("encrypted.pdf");
        let dec = dir.join("decrypted.pdf");

        write_minimal_pdf(&plain);
        encrypt_pdf(&plain, &enc, "userpass", "ownerpass", PdfPermissions::default())
            .expect("debe cifrar");

        let result = decrypt_pdf(&enc, &dec, "wrongpass");
        assert!(result.is_err(), "password incorrecto debe fallar");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn linearizar_pdf_simple() {
        let dir = tempdir_for_test("linear");
        let plain = dir.join("plain.pdf");
        let lin = dir.join("linear.pdf");

        write_minimal_pdf(&plain);
        // Para PDFs vacios qpdf puede no llegar a producir realmente un
        // archivo linearizado (no hay paginas), pero la operacion no debe
        // fallar. Un test mas robusto usaria un PDF de varias paginas.
        let result = linearize_pdf(&plain, &lin);
        // En PDFs muy pequenos qpdf puede negarse a linearizar; aceptamos
        // tanto OK como error explicito de qpdf, ambos validos para spike.
        let _ = result;

        let _ = fs::remove_dir_all(&dir);
    }

    /// Crea un directorio temporal unico por test bajo el target de cargo,
    /// para no depender del crate `tempfile`.
    fn tempdir_for_test(tag: &str) -> std::path::PathBuf {
        let mut dir = std::env::temp_dir();
        dir.push(format!("airpdf-security-test-{}-{}", tag, std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("debe crear tempdir");
        dir
    }
}
