# opendataspace-edc-config

Web app para configurar y desplegar assets de API en Eclipse Dataspace Connector (EDC), siguiendo el framework Gaia-X.

## Qué hace

Lee una especificación OpenAPI, permite configurar policies ODRL y metadatos Gaia-X, y crea los recursos necesarios en un conector EDC:

- **Assets** — uno por operación de la API seleccionada
- **Policies** — Access Policy + Contract Policy (ODRL/JSON-LD)
- **Contract Definition** — vincula policies con assets

## Flujo de la UI

| Step | Nombre | Descripción |
|------|--------|-------------|
| 1 | **OpenAPI** | Carga spec OpenAPI (YAML/JSON) + historial previo opcional |
| 2 | **Configuración** | Conexión EDC, servicio, policies ODRL (Level 1/2/3/Custom), catálogo, proveedor, auth |
| 3 | **Revisar** | Preview de policies, assets y Contract Definition antes de desplegar. Permite editar el ID del CD |
| 4 | **Despliegue** | Reconcilia recursos en EDC y muestra resultados |

## Arquitectura

```
server.js                  → Express routes (thin controller)
server/
  openapi-parser.js        → OpenAPI spec parsing + operation extraction
  reconciler.js            → EDC resource reconciliation orchestration
  output-builder.js        → JSON response construction from reconcile results
  edc-client.js            → HTTP helpers for EDC Management API (GET/POST/PUT/DELETE)
  policy-builder.js        → ODRL policy payload generation
  asset-builder.js         → EDC asset payload generation
  helpers.js               → Shared utilities (slugify, extractBasePath)
public/
  index.html               → HTML structure only — NO inline JS, NO inline CSS
  css/styles.css           → All styles
  js/i18n.js               → Translations (ES/EN) + t() + setLang()
  js/policy-editor.js      → Policy editor state, constants, rendering, preview
  js/review.js             → Step 3 review/preview: policies, assets summary, contract def
  js/deploy.js             → Navigation, deploy, conflict dialog, results rendering, download
  js/app.js                → App globals, file handling, history, ops table, init
  js/iframe-bridge.js      → PostMessage bridge for embedding in APIQuality
```

## Historial y ediciones

### Carga de historial previo (Step 1)

Al cargar un JSON de resultado de un despliegue anterior, la app:

1. **Pre-llena el formulario** — EDC URL, servicio, proveedor, catálogo, auth se recuperan del historial
2. **Marca operaciones como "Desplegadas"** — compara los asset IDs del historial con las operaciones del OpenAPI actual
3. **Detecta cambios** — en Step 3 muestra cuántos assets son nuevos, cuántos se actualizarán y cuántos se eliminarán
4. **Permite edición incremental** — añadir/quitar operaciones, cambiar policies, modificar metadatos sin perder lo anterior

### Flujo de edición típico

```
1. Cargar OpenAPI (nuevo o el mismo)
2. Cargar JSON de historial del despliegue anterior
3. Hacer cambios:
   - Marcar/desmarcar operaciones → añade/elimina assets
   - Cambiar nivel de policy → actualiza policies
   - Editar metadatos → actualiza assets
4. Step 3 muestra preview con diff: "3 nuevos, 5 se actualizarán, 1 se eliminará"
5. Desplegar → el reconciler aplica solo los cambios necesarios
```

### Resultado descargable

Tras cada despliegue, se genera un JSON con:
- Config completa (EDC URL, servicio, proveedor, policies, catálogo)
- Recursos creados (assets, policies, contract definition) con sus payloads y estados
- Timestamp

Este JSON sirve como historial para el próximo despliegue y se guarda automáticamente en `output/`.

## Reconciliación EDC

El reconciler sigue este orden al desplegar:

1. **Eliminar Contract Definition** existente (desbloquea policies/assets)
2. **Detectar conflictos** — si hay un Contract Agreement activo, el CD no se puede borrar (409)
3. **Crear/actualizar Policies** (DELETE + POST, EDC no soporta PUT real en policies)
4. **Crear/actualizar Assets** (DELETE + POST) + eliminar assets obsoletos del historial
5. **Crear Contract Definition** con el ID elegido por el usuario

### Por qué DELETE + POST en vez de PUT

- EDC devuelve **405** en PUT de assets (no soportado)
- EDC **acepta** PUT en policies pero **ignora los cambios** silenciosamente
- Solución: siempre DELETE del recurso existente + POST del nuevo
- Las policies no se pueden borrar mientras estén referenciadas por un CD → por eso se borra el CD primero (paso 1)

## Manejo de errores

### Policy rechazada por el conector (HTTP 422)

Si el conector EDC no soporta el nivel de policy seleccionado (ej: Level 2 o 3 sin extensiones Java instaladas):

1. El servidor detecta el error al intentar crear la policy (el EDC devuelve 400)
2. **Se detiene el despliegue completo** — no se crean assets ni Contract Definition
3. El frontend vuelve al **Step 2** (configuración de policies)
4. Se muestra un banner de error con:
   - Qué policy fue rechazada y el error del EDC
   - Qué **sí soporta** el conector (Level 1, operators nativos `eq`/`neq`/`in`)
   - Qué **no soporta** sin extensiones Java (Level 2, Level 3, leftOperands custom)

### Conflicto por contrato activo (HTTP 409)

Cuando existe un Contract Agreement negociado sobre el Contract Definition actual, el EDC no permite borrar el CD. El flujo es:

1. El reconciler detecta el 409 al intentar borrar el CD
2. Se calcula un **diff** consultando el estado actual en el EDC:
   - Cambios en policies (nivel actual vs deseado)
   - Assets añadidos, eliminados y sin cambios
3. Se muestra un **diálogo de conflicto** con 3 opciones:

| Opción | Comportamiento |
|--------|---------------|
| **Eliminar y recrear** | Intenta forzar DELETE + POST con el mismo ID. Si el EDC lo bloquea, muestra el error real |
| **Crear nuevo CD** | Crea un CD con ID versionado (`{id}-v{timestamp}`), reutilizando las mismas policies. El CD anterior sigue sirviendo contratos existentes |
| **Cancelar** | Vuelve al Step 3 sin hacer cambios |

### Errores de conexión

Si el servidor o el conector EDC no responden, se muestra el error de red en Step 4 con opción de volver a intentar.

### Warnings en el editor de policies (Step 2)

- **Level 2/3**: Se muestra un aviso de que requieren extensiones Java (SSI Gaia-X)
- **Custom operators/leftOperands**: Se muestra un warning de `PolicyFunction requerida` explicando que sin la extensión Java, el EDC evaluará el constraint como TRUE silenciosamente (riesgo de seguridad)

## Policies ODRL

### Estructura dual

El Contract Definition requiere **dos policies separadas**:

- **Access Policy** — controla quién **ve** el asset en el catálogo. Acción: `access`
- **Contract Policy** — controla quién puede **negociar** un contrato. Acción: `use`

Cada una se configura independientemente con su propio nivel y constraints.

### Niveles

| Level | Descripción | Constraints | Requisitos del conector |
|-------|-------------|-------------|------------------------|
| Level 1 | Uso abierto | Ninguno (`odrl:use` sin restricciones) | Vanilla EDC |
| Level 2 | Membresía Gaia-X | `Membership eq active` + prohibición `distribute` | Extensión SSI Gaia-X |
| Level 3 | Soberanía UE | Membership + `DataProcessing.location eq EU/EEA` + prohibiciones transfer/distribute/derive | 2 extensiones SSI + infra EU |
| Custom | Editor libre | Constraints, prohibiciones y obligaciones configurables | Depende de los operadores usados |

### Formato JSON-LD

Las policies se envían al EDC con este formato:

```json
{
  "@context": { "@vocab": "https://w3id.org/edc/v0.0.1/ns/" },
  "@type": "PolicyDefinition",
  "@id": "{slug}-access-policy",
  "policy": {
    "@context": "http://www.w3.org/ns/odrl.jsonld",
    "@type": "Set",
    "permission": [{ "action": "use" }]
  }
}
```

El contexto exterior es el namespace EDC (`@vocab`), el interior es ODRL estándar.

### Editor de policies custom

El editor permite añadir:

- **Constraints** (permission) — leftOperand + operator + rightOperand. Catálogo completo de operandos Catena-X y Gaia-X con autocompletado de valores conocidos
- **Prohibiciones** — acciones ODRL que el consumidor NO puede realizar (distribute, transfer, derive, etc.), con constraints opcionales
- **Obligaciones** — acciones que el consumidor DEBE realizar (inform, compensate, etc.), con constraints opcionales

Operators nativos del EDC (sin extensiones): `eq`, `neq`, `in`. Cualquier otro operator o leftOperand custom requiere una PolicyFunction Java.

## Contract Definition

### Generación del ID

- Auto-generado: `{slugify(apiName)}-contract-def`
- Editable en Step 3 — el usuario puede cambiarlo antes de desplegar
- Si hay conflicto y el usuario elige "Crear nuevo", se versiona: `{id}-v{timestamp}`

### Estructura

```json
{
  "@context": { "@vocab": "https://w3id.org/edc/v0.0.1/ns/" },
  "@type": "ContractDefinition",
  "@id": "{slug}-contract-def",
  "accessPolicyId": "{slug}-access-policy",
  "contractPolicyId": "{slug}-contract-policy",
  "assetsSelector": [{
    "@type": "CriterionDto",
    "operandLeft": "https://w3id.org/edc/v0.0.1/ns/id",
    "operator": "in",
    "operandRight": ["asset-id-1", "asset-id-2"]
  }]
}
```

## Assets

Cada operación seleccionada del OpenAPI se convierte en un asset EDC con:

- **ID**: `{slug}-{operationId}`
- **Metadatos**: nombre, descripción, versión, método HTTP, path, summary
- **Catálogo**: keywords, idioma, contentType, creator
- **Proveedor**: DID, razón social, copyright, licencia SPDX, email, país, términos
- **Data Address**: URL upstream + basePath + path de la operación
- **Auth**: según el modo elegido (none, API key, vault, OAuth2 client credentials)

## Autenticación del upstream

| Modo | Descripción | Campo en dataAddress |
|------|-------------|---------------------|
| **None** | Sin autenticación | — |
| **API Key / Token** | Header + valor estático | `authKey` + `authCode` |
| **Vault** | Header + secreto del vault EDC | `authKey` + `secretName` |
| **OAuth2** | Client credentials automático | `oauth2:tokenUrl` + `oauth2:clientId` + `oauth2:clientSecretKey` |

## Requisitos

- Node.js 18+
- Acceso a un conector EDC con Management API v3

## Instalación

```bash
git clone <repo-url>
cd opendataspace-edc-config
npm install
```

## Ejecutar el proyecto

```bash
npm start
```

El servidor arranca en `http://localhost:3000` (o el puerto definido en `PORT`).

## Uso

1. Abrir `http://localhost:3000` en el navegador
2. **Step 1 — OpenAPI**: Cargar una spec OpenAPI (YAML o JSON). Opcionalmente, cargar un JSON de historial de un despliegue anterior para editar recursos existentes
3. **Step 2 — Configuración**: Rellenar la URL del Management API del EDC, datos del servicio, proveedor, catálogo, autenticación del upstream y nivel de policies ODRL (Level 1/2/3/Custom)
4. **Step 3 — Revisar**: Verificar el preview de policies, assets y Contract Definition. Editar el ID del CD si es necesario
5. **Step 4 — Desplegar**: Lanzar la reconciliación. La app crea/actualiza/elimina los recursos necesarios en el EDC y muestra los resultados
6. **Descargar resultado**: El JSON generado se puede descargar y reutilizar como historial en futuros despliegues

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/parse-openapi` | Parsea spec OpenAPI, retorna operaciones |
| POST | `/api/create-edc-resources` | Reconcilia recursos en EDC |
| GET | `/api/configs` | Lista configuraciones guardadas |
| GET | `/api/configs/:filename` | Obtiene una configuración guardada |
| GET | `/api/health` | Health check |

## Integración via iframe (PostMessage)

La app se puede embeber en un iframe. La comunicación se hace via `postMessage`.

### Lo que necesita el form

```json
{
  "openapi_yaml_in_base64": "string (OBLIGATORIO)",
  "history_b64": "string (OPCIONAL — config previo para editar)"
}
```

### Lo que devuelve el form

```json
{
  "files": [
    {
      "filename": "edc-config.json",
      "content_in_base64": "string (JSON del resultado del deploy en base64)"
    }
  ]
}
```

## i18n

Soporta Español (ES) e Inglés (EN). El idioma se guarda en `localStorage`.

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JS (sin framework, sin bundler)
- **EDC API**: Management API v3 (JSON-LD payloads)
- **Policies**: ODRL con contextos EDC + ODRL
- **i18n**: Implementación custom con ES/EN

## Procedimientos técnicos

### Añadir un nuevo nivel de policy

1. Definir las constantes del nivel en `public/js/policy-editor.js` (constraints, prohibiciones, obligaciones)
2. Añadir las traducciones en `public/js/i18n.js` (claves ES/EN)
3. Implementar la generación del payload en `server/policy-builder.js`
4. Añadir el warning correspondiente en el editor si requiere extensiones Java

### Añadir un nuevo módulo server

1. Crear el archivo en `server/` con responsabilidad única (máx. 300 líneas)
2. Usar CommonJS (`require`/`module.exports`)
3. Importarlo desde `server.js` si expone rutas, o desde el módulo que lo consume
4. No incluir lógica de negocio en `server.js` — solo routing

### Añadir un nuevo archivo JS frontend

1. Crear el archivo en `public/js/` con nombre en kebab-case
2. Documentar en el header del archivo qué globals expone y de cuáles depende
3. Añadir el `<script>` en `index.html` respetando el orden de dependencias:
   `i18n.js` → `policy-editor.js` → `review.js` / `deploy.js` → `app.js`
4. No usar ES modules — usar `<script>` clásicos con globals

### Añadir traducciones

1. Abrir `public/js/i18n.js`
2. Añadir la clave en ambos objetos (`es` y `en`)
3. Usar `t('clave')` en el código frontend para referenciarla
