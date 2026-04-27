# ADR 0002 - Firma digital: esperar RENIEC

**Fecha:** 2026-04-26
**Status:** Aceptado
**Decidido por:** Alfredo Pachas

## Contexto

El Sub-plan 2.0.B del Plan v0.4 (ver
`docs/superpowers/specs/2026-04-26-firma-pkcs7-decision.md`) planteo dos
caminos para implementar firma digital en AirPDF:

- **Camino 1:** Implementar firma PKCS#7 generica con cert local (.p12)
  ya en v0.4. Sumar integracion RENIEC en v0.5+.
- **Camino 2:** Esperar a tener certificado RENIEC operativo y entregar
  firma generica + RENIEC juntos en una sola version.

## Decision

**Camino 2.** Alfredo elige diferir la firma digital hasta tener
operativo el certificado RENIEC sobre DNIe.

## Razones

1. AirPDF tiene como primer caso de uso documentos clinicos peruanos
   (recetas, informes, historias) donde la firma con validez legal
   nacional pesa mas que la firma generica.
2. Lanzar firma generica primero genera expectativa equivocada en los
   usuarios (creerian que ya tienen validez legal cuando no es asi
   sin RENIEC en Peru).
3. Mantener una sola implementacion atomica reduce riesgo de
   inconsistencias entre dos versiones de firma.
4. El backlog v0.4 ya tiene mucho valor sin firma (password protection,
   live preview, PoC visor, sanitize PDF, auto-redact, blank detection,
   PDF/A). v0.4 puede shipear sin firma.

## Consecuencias

### Positivas

- v0.4 entrega valor real sin esperar el tramite RENIEC.
- Cuando salga la firma (v0.5+), tendra validez legal completa desde
  el primer dia.
- Codigo mas limpio: una sola implementacion, no migracion despues.

### Negativas

- v0.4 NO tiene firma digital (gap visible vs Acrobat Pro).
- Sub-plan 2.0.B queda parqueado hasta que termine el tramite RENIEC.
- Si Alfredo quiere firmar PDFs antes del release de v0.5+, debe usar
  otra herramienta temporalmente (Acrobat Reader DC, OpenSign, etc.).

### Bloqueos a resolver antes de retomar el sub-plan

- [ ] Tramite RENIEC completo (ver
      `docs/decisions/firma-digital-reniec-tramite.md`)
- [ ] DNIe v2.0 o v3.0 vigente
- [ ] Lector de smartcard comprado e instalado
- [ ] Middleware RENIEC operativo
- [ ] Certificado inyectado al chip
- [ ] PIN de usuario definido y memorizado

Cuando todos esos checkboxes esten OK, abrir un nuevo plan
"Plan v0.5 - Firma digital con RENIEC" basado en la spec
`2026-04-26-firma-pkcs7-decision.md` aplicando el bloque B7
(integracion PKCS#11) ademas de B1-B6.

## Impacto en otros documentos

- Spec `2026-04-26-firma-pkcs7-decision.md`: anotar al inicio que
  Camino 2 fue elegido. Mantener el resto como referencia tecnica.
- Plan `2026-04-26-air-pdf-plan-2.0-evaluacion-componentes-oss.md`:
  marcar 2.0.B como diferido a v0.5+, NO ejecutar en v0.4.
- CHANGELOG futuro de v0.4: declarar explicitamente que firma digital
  sigue diferida y enlazar a este ADR.
