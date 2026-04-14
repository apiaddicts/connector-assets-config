# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-04-13

### Added

- Soporte para conector Rainbow (Eunomia/UPM) como alternativa a EDC
- Selector de tipo de conector (EDC / Rainbow) en el formulario
- Vinculacion obligatoria de Service Offering Gaia-X firmada para ambos conectores
- Auto-verificacion y preview de la Service Offering al pegar la URL
- Auto-completar campos del formulario desde la Service Offering verificada
- Nuevo endpoint `/api/service-offering` para descargar y validar VCs de tipo gx:ServiceOffering
- Nuevo endpoint `/api/rainbow-proxy` para consultar la API de Rainbow
- Rainbow: creacion de Catalog, Data Service, Datasets, Distributions y Policies ODRL
- Rainbow: reconciliacion con PUT (edita en vez de borrar y recrear, preserva IDs y contratos)
- Rainbow: selector de formato de transferencia (http+pull / http+push)
- Rainbow: soporte para historial (cargar JSON de despliegue anterior para actualizar)
- Preview de Service Offering vinculado en el paso de revision
- Traducciones ES/EN para todos los elementos nuevos
- Validacion de campos condicional segun el tipo de conector seleccionado

### Changed

- Assets EDC ya no duplican metadata Gaia-X como strings; solo incluyen el link a la Service Offering firmada (`gx:serviceOfferingVc`)
- Datasets Rainbow usan `dct:conformsTo` apuntando a la URL de la Service Offering
- Tarjetas de Participante Legal, Recurso Gaia-X y Metadatos del Catalogo eliminadas del formulario (la info viene de la Service Offering firmada)
- Header y subtitulo actualizados de "Gaia-X EDC" a "Gaia-X Dataspace"
- Descripcion de policies adaptada segun el conector (EDC: access + contract, Rainbow: una sola por dataset)
- Textos dinamicos en la UI segun el conector (Assets vs Datasets, botones, hints, labels)
- Output JSON incluye `connectorType`, `serviceOfferingUrl` y URL del conector
- Fingerprint de duplicados adaptado por conector

### Removed

- Campos `gx:*` duplicados en los assets EDC (legalName, providedBy, license, copyright, PII, terms, etc.)
- Importacion de `gaiax-fields.js` en el asset builder
- Campo `gaiaxPolicyLevel` de los assets

## [1.0.0] - 2026-03-15

### Added

- Formulario web para configurar y desplegar assets de API en Eclipse Dataspace Connector (EDC)
- Carga de especificacion OpenAPI (YAML/JSON)
- Configuracion de politicas ODRL (Level 1, 2, 3 y Custom)
- Campos Gaia-X Trust Framework 24.04 (LegalParticipant, DataResource, ServiceOffering)
- Autenticacion del upstream (Direct, Vault, OAuth2)
- Deteccion de conflictos con contratos activos
- Reconciliacion de assets (crear, actualizar, eliminar)
- Historial de despliegues (cargar JSON anterior)
- Validacion de campos en tiempo real
- Soporte bilingue ES/EN
- Descarga de JSON de resultados