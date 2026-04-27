# Spec: Firma digital PKCS#7 - Decision y plan

**Fecha:** 2026-04-26
**Sub-plan origen:** 2.0.B del plan de evaluacion OSS (v0.4)
**Status:** Bloqueado por decision de Alfredo. Ejecutar AL FINAL del v0.4
(despues de A, C, D segun orden acordado).

## Decision pendiente

Antes de cualquier codigo, Alfredo debe elegir UNO de estos caminos:

### Camino 1: PKCS#7 generico ya, RENIEC despues

- Implementar firma con cualquier certificado .p12 / .pfx local
  (autoemitido o comprado a una CA comercial).
- Acrobat Reader muestra la firma como valida con warning de cert no
  confiable (esperado para autoemitido) o trusted si la CA esta en el
  trust store.
- Tiempo estimado: 2-3 sesiones de codigo.
- Bloqueante: ninguno tecnico.
- Riesgo: si despues se quiere RENIEC, la integracion con DNIe (PKCS#11)
  requiere trabajo adicional, no es solo cambiar el .p12.

### Camino 2: Esperar a tener cert RENIEC y hacer ambos juntos

- Pre-requisito: completar el tramite de
  `docs/decisions/firma-digital-reniec-tramite.md`. Implica:
  - Tener DNIe (o tramitarlo, S/41)
  - Comprar lector smartcard (S/80-150)
  - Instalar middleware RENIEC
  - Inyectar certificado al chip
- Implementar firma generica + integracion PKCS#11 con el smartcard.
- Tiempo estimado: 4-6 sesiones de codigo + tiempo del tramite (semanas).
- Bloqueante: tramite RENIEC.
- Beneficio: validez legal completa en Peru desde el dia 1 de release.

### Recomendacion del autor

**Camino 1.** Razones:

1. Desbloquea inmediatamente la feature "firma" para uso interno y
   profesional (Alfredo puede comprar un cert comercial economico tipo
   Sectigo Personal por ~$15/ano si quiere validez sin RENIEC).
2. La arquitectura PKCS#7 generica deja preparado el terreno para
   sumar PKCS#11 / RENIEC despues sin reescribir el modulo.
3. Evita acoplar la roadmap de software a un tramite burocratico que
   tiene su propio tiempo.

## Si la decision es Camino 1: plan de implementacion

### B1 - Spike de viabilidad de `pdf_signing` crate

Evaluar si el crate https://github.com/ralpha/pdf_signing esta
suficientemente mantenido y produce firmas que Acrobat Reader valide.

```powershell
cd "D:\Dropbox\Claude Code\air-pdf"
git checkout main
git checkout -b spike/v0.4-pdf-signing
# Probar agregando la dep en una rama experimental
```

Si pdf_signing no es viable (sin commits recientes, API rota), evaluar
alternativa: implementar PKCS#7 manualmente con `pkcs7` crate +
manipulacion de `lopdf` para insertar el campo `/Sig` en el AcroForm.

### B2 - Modulo `pdf::sign`

Ubicacion: `src-tauri/src/pdf/sign.rs`.

API minima:

```rust
pub struct SignParams {
    pub p12_path: PathBuf,
    pub p12_password: String,
    pub reason: Option<String>,
    pub location: Option<String>,
    pub contact: Option<String>,
    pub signer_name: String,
    // Posicion visual de la firma en el PDF
    pub page: u16,
    pub rect: SignRect, // x, y, width, height en puntos
    // Imagen opcional para la representacion visual (firma escaneada)
    pub appearance_image: Option<PathBuf>,
}

pub fn sign_pdf(input: &Path, output: &Path, params: SignParams) -> Result<()>;

pub fn list_signatures(pdf: &Path) -> Result<Vec<SignatureInfo>>;

pub fn verify_signature(pdf: &Path, sig_index: usize) -> Result<VerifyResult>;
```

### B3 - Tests con cert autoemitido

Generar cert de prueba en el repo (gitignored para evitar commitearlo
por accidente):

```powershell
openssl req -x509 -newkey rsa:2048 -keyout test-key.pem -out test-cert.pem -days 365 -nodes -subj "/CN=AirPDF Test"
openssl pkcs12 -export -out tests/fixtures/test-cert.p12 -inkey test-key.pem -in test-cert.pem -password pass:test1234
rm test-key.pem test-cert.pem
echo "tests/fixtures/test-cert.p12" >> .gitignore
```

Tests:
- Firmar un PDF y verificar que el archivo resultante tiene un campo
  `/Sig` valido (parsear con `lopdf` y assertir presencia).
- Verificar que `verify_signature` reporta firma valida.
- Verificar que modificar 1 byte del PDF firmado y reintentar verify
  reporta firma rota.

### B4 - Comandos Tauri

`src-tauri/src/commands/sign.rs`:

```rust
#[tauri::command]
pub async fn pdf_sign(
    input_path: String,
    output_path: String,
    p12_path: String,
    p12_password: String,
    signer_name: String,
    reason: Option<String>,
    location: Option<String>,
    page: u16,
    rect_x: f32, rect_y: f32, rect_w: f32, rect_h: f32,
    appearance_image_path: Option<String>,
) -> Result<(), String> { ... }

#[tauri::command]
pub async fn pdf_list_signatures(input_path: String) -> Result<Vec<SignatureInfo>, String>;

#[tauri::command]
pub async fn pdf_verify_signature(input_path: String, sig_index: u32) -> Result<VerifyResult, String>;
```

### B5 - UI

`src/components/dialogs/SignDialog.tsx`:

- Selector de archivo .p12 (Tauri dialog)
- Input password
- Inputs reason / location / signer name
- Selector de pagina + arrastre visual del rect en preview de la pagina
- Opcional: cargar imagen de firma escaneada
- Boton "Firmar"

`src/components/dialogs/VerifySignaturesDialog.tsx`:

- Lista de firmas presentes en el PDF actual
- Estado: valida / invalida / cert no confiable
- Detalles del firmante

### B6 - ADR

Crear `docs/decisions/0002-firma-digital-alcance.md` documentando:

- Que NO se implementa PAdES-LTV (long-term validation con timestamp y
  CRL/OCSP). Razon: requiere TSA y validacion online.
- Que NO se implementa firma con DNIe / RENIEC en este sub-plan.
  Razon: requiere PKCS#11 + middleware. Si Alfredo elige Camino 1,
  esto va a v0.5+.
- Que el alcance es PKCS#7 detached, basico, suficiente para uso
  profesional con cert comercial o autoemitido.

## Si la decision es Camino 2: plan de implementacion

Mismo plan que Camino 1 + agregar:

### B7 - Integracion PKCS#11 con DNIe

- Crate `cryptoki` o `pkcs11` (revisar madurez en Rust en 2026).
- Detectar lectores conectados.
- Listar certificados disponibles en el chip.
- Pedir PIN de usuario.
- Firmar usando el chip (la clave privada nunca sale del DNIe).

Tiempo extra estimado: +3-4 sesiones.

## Definition of done (independiente del camino)

- Firmar un PDF con un cert local genera un archivo que Acrobat Reader
  abre, muestra la firma con icono de "firmado", y muestra los detalles
  del firmante.
- Modificar 1 byte del PDF firmado hace que Acrobat reporte la firma
  como invalida.
- La UI permite firmar sin tocar la consola.
- Tests Cargo: incluyen al menos 4 tests de firma (sign, list, verify
  ok, verify roto). Suite continua en verde.

## Por que va al final

1. Mayor riesgo tecnico (criptografia es facil de hacer mal).
2. Bloqueado por decision pendiente del usuario (Camino 1 vs 2).
3. Si Camino 2: bloqueado tambien por tramite RENIEC.
4. Los otros sub-planes (A, C, D) entregan valor sin esperar esta
   decision.

## Referencias

- ADR existente del tramite: `docs/decisions/firma-digital-reniec-tramite.md`
- pdf_signing crate: https://github.com/ralpha/pdf_signing
- pkcs7 crate: https://crates.io/crates/pkcs7
- cryptoki (PKCS#11): https://crates.io/crates/cryptoki
- Especificacion PAdES: https://www.etsi.org/deliver/etsi_ts/102700_102799/10277801/
- Plan origen: `docs/superpowers/plans/2026-04-26-air-pdf-plan-2.0-evaluacion-componentes-oss.md`
