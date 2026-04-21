# Trámite Firma Digital RENIEC — Checklist

Documento de referencia para Alfredo Pachas. Necesario para integrar firma digital con validez legal peruana en AirPDF (Fase 2, v0.2.0).

## Decisión previa: ¿qué tipo de certificado?

| Tipo | Para quién | Uso recomendado |
|---|---|---|
| **Persona Natural** | Cualquier ciudadano | Recetas, informes médicos personales, contratos personales, firma de PDFs en general |
| **Persona Jurídica** | Empresa (Neumología Peruana SAC, AirPro, Botica) | Documentos corporativos, facturas electrónicas, contratos comerciales |
| **Profesional / Funcionario** | Médicos colegiados, notarios | Actos profesionales con sello de colegiatura |

**Recomendación:** empezar con **Persona Natural** (gratis, rápido, cubre 90% de uso médico/personal). Si AirPro o Botica necesitan firma corporativa después, tramitar Persona Jurídica como segundo paso.

## Prerequisito: DNI electrónico (DNIe)

El certificado digital RENIEC se **inyecta en el chip del DNIe**. Sin DNIe no hay firma RENIEC.

### ¿Tienes DNIe ya?

Verifica tu DNI:
- **DNIe v2.0 o v3.0** → tarjeta con chip dorado visible al frente, dice "DNI electrónico"
- **DNI azul convencional** → solo banda magnética, sin chip → necesitas tramitar DNIe primero

## Ruta A — Ya tienes DNIe

### Documentos a presentar
- [ ] DNIe v2.0 o v3.0 vigente (no vencido)
- [ ] Recibo de pago por derechos administrativos (si aplica renovación; emisión inicial es gratuita)

### Equipamiento requerido en casa
- [ ] **Lector de smartcard** compatible con DNIe (modelos sugeridos: Bit4id miniLector EVO, ACS ACR39U, HID Omnikey 3121). Costo aprox S/ 80-150 en Mercado Libre / Linio
- [ ] Software RENIEC instalado: **"Middleware DNIe"** (descarga gratis desde https://pki.reniec.gob.pe)
- [ ] Navegador **Microsoft Edge** (la plataforma RENIEC no funciona bien en Chrome/Firefox)

### Pasos
1. Comprar lector smartcard
2. Instalar middleware RENIEC en la PC
3. Insertar DNIe en el lector
4. Ir a https://identidad.reniec.gob.pe → Plataforma Ciudadano Digital
5. Descargar e inyectar certificado al chip
6. Definir clave secreta de 6-8 dígitos (¡no olvidarla, es irrecuperable!)

**Costo total ruta A:** S/ 80-150 (solo el lector). El certificado es gratis.

## Ruta B — No tienes DNIe todavía

### Documentos a presentar en oficina RENIEC
- [ ] DNI azul actual (original)
- [ ] Recibo de pago: aprox **S/ 41.00** por DNIe v3.0 (verificar tarifa vigente en gob.pe)
- [ ] Foto reciente tamaño pasaporte (algunas oficinas la toman ahí mismo)
- [ ] Comprobante de domicilio actualizado (recibo de luz/agua últimos 3 meses)

### Pasos
1. Pagar derecho de trámite en Banco de la Nación o agente autorizado (código de tasa RENIEC para DNIe)
2. Sacar cita en https://citasenlinea.reniec.gob.pe (recomendado, evita colas)
3. Acudir a oficina RENIEC con DNI + recibo + foto
4. Toma de huellas, foto y firma digital del titular
5. Solicitar **expresamente** que activen el certificado digital (Persona Natural) durante el trámite — viene incluido sin costo extra
6. Recoger DNIe en 5-10 días hábiles
7. Comprar lector smartcard e instalar middleware (ver ruta A)

### Oficinas RENIEC en Lima (sugeridas para Alfredo)
- **Sede Central RENIEC** — Av. Bolivia 109, Centro de Lima (más completa, atiende todo)
- **Plataforma RENIEC Miraflores** — Av. Larco
- **Plataforma RENIEC San Isidro** — Centro Empresarial Real
- **Lista oficial de oficinas EREP:** https://identidad.reniec.gob.pe/servicios

**Costo total ruta B:** ~S/ 41 (DNIe) + S/ 80-150 (lector) = **S/ 121-191**

## Datos personales para llenar el formulario

Tener a la mano (RENIEC los pide en el momento):
- [ ] Nombres y apellidos completos según DNI
- [ ] Número DNI
- [ ] Correo electrónico activo (recibirás notificaciones de vencimiento del certificado)
- [ ] Teléfono celular
- [ ] Dirección domiciliaria actualizada
- [ ] Si quieres incluir colegiatura médica (CMP): número de colegiatura + constancia de habilitación CMP vigente (opcional pero útil para firmar documentos médicos como tales)

## Vigencia y renovación

- **Duración del certificado:** 4 años desde emisión
- **Renovación:** trámite similar, también gratis para Persona Natural
- RENIEC notifica al correo registrado 60 días antes del vencimiento

## Integración futura en AirPDF

Cuando llegue Fase 2 del proyecto, AirPDF leerá el certificado del chip vía:
- **Windows:** API CryptoAPI / CSP del middleware RENIEC
- **Estándar:** PKCS#11 (alternativa multiplataforma)

El usuario insertará el DNIe, AirPDF firmará el PDF aplicando hash + cifrado con clave privada del chip, y el PDF resultante validará en Adobe Reader, foxit, y portales del Estado peruano (SUNAT, MINSA, etc.).

## Contacto RENIEC

- **Web certificados:** https://identidad.reniec.gob.pe
- **Portal PKI técnico:** https://pki.reniec.gob.pe
- **Trámite oficial Estado:** https://www.gob.pe/693-solicitar-certificacion-digital
- **Teléfono:** (01) 315-4000 / (01) 315-2700 anexo 1900
- **Email:** identidaddigital@reniec.gob.pe
- **Horario:** L-V 08:30-17:00, Sáb 08:30-13:00

## Próximos pasos sugeridos

1. Verificar si tu DNI actual es electrónico (revisar chip dorado)
2. Si NO → ir a Ruta B, agendar cita en RENIEC esta semana
3. Si SÍ → comprar lector smartcard primero, después descargar online
4. Una vez obtenido, probarlo firmando un PDF de prueba con Adobe Reader (validación)
5. Cuando AirPDF llegue a Fase 2 (~6 semanas después del beta v0.1.0), tu firma estará lista para integración
