# SisLoPe

SisLoPe es el modulo geoespacial del ecosistema Data Trade para visualizar infraestructura logistica, nodos aduaneros, rutas y capas operativas del Peru.

## Estado Actual

- Frontend: React, TypeScript, Vite, MapLibre, Deck.gl, Three.js, D3, Turf y Zustand.
- Deploy: SPA en Vercel con fallback a `index.html`.
- Datos principales: capas y datasets del frontend en `src/data/*` y repositorios internos.
- Auth actual en este snapshot: serverless functions propias en `api/auth/*`, basadas en PostgreSQL compartido legacy (`public.usuarios` / `public.auth_sessions`).
- Data Trade Auth central (`apps/api /auth/*`): pendiente de migracion en este repo.
- Backend maritimo: `services/maritime-api`, separado del frontend.

## Desarrollo Local

```bash
npm install
npm run dev
```

Validacion:

```bash
npm run lint
npm run test
npm run build
```

## Variables Frontend

```text
VITE_ADEX_URL=https://adex-palletizer.vercel.app
VITE_ALVIN_URL=https://alvin-comex.streamlit.app
VITE_MAP_STYLE_URL=
VITE_USE_INLINE_FALLBACK_STYLE=true
VITE_ENABLE_MARITIME_TRACKING=false
VITE_ENABLE_MARITIME_TRACKING_MAP=false
VITE_MARITIME_API_BASE_URL=
```

Si `VITE_MAP_STYLE_URL` queda vacia, SisLoPe usa el fallback oscuro interno sin token.

## Auth Actual Y Proxima Migracion

El login visual de SisLoPe ya existe y debe mantenerse como unica puerta de entrada del modulo.

Estado actual:

```text
AuthScreen SisLoPe
  -> /api/auth/login
  -> api/lib/auth.ts
  -> PostgreSQL legacy compartido
```

Recepcion de sesion desde ADEX:

```text
ADEX boton SisLoPe
  -> apps/api POST /auth/handoff/create
  -> VITE_SISLOPE_URL?handoff=<code>
  -> SisLoPe POST /auth/handoff/exchange
  -> sesion Data Trade en memoria
  -> history.replaceState limpia handoff de la URL
```

El `handoff` es temporal, de un solo uso, y no contiene email, password, access token ni refresh token. Si el canje falla, SisLoPe muestra su login normal.

Proxima convergencia esperada:

```text
AuthScreen SisLoPe
  -> VITE_DATA_TRADE_API_URL/auth/login
  -> apps/api schema data_trade
```

Variables esperadas para la migracion futura:

```text
VITE_DATA_TRADE_API_URL=http://localhost:8788
VITE_DATA_TRADE_TRACKING_ENABLED=true
VITE_DATA_TRADE_MODULE_CODE=sislope
```

No debe agregarse un segundo login visible ni un panel "Cuenta Data Trade".

## Tracking Maritimo Y Heatmap Diario

SisLoPe no consulta proveedores AIS directamente desde el navegador.

Flujo esperado:

1. Un job/worker externo consolida una fuente publica agregada.
2. Ese proceso importa un snapshot diario al `maritime-api`.
3. El frontend consulta el read model resumido persistido.

Feature flags:

```text
VITE_ENABLE_MARITIME_TRACKING=false
VITE_ENABLE_MARITIME_TRACKING_MAP=false
VITE_MARITIME_API_BASE_URL=
```

Mientras `VITE_ENABLE_MARITIME_TRACKING=false`, el mapa principal no cambia su UX.

## maritime-api

El backend maritimo vive en `services/maritime-api` y esta pensado para desplegarse aparte del frontend, por ejemplo en Railway con PostgreSQL.

Comandos desde la raiz de SisLoPe:

```bash
npm run maritime:build
npm run maritime:test
npm run maritime:lint
npm run maritime:db:migrate
npm run maritime:heatmap:sync:gfw
npm run maritime:heatmap:sync:gfw:dry-run
```

Importacion manual:

```bash
npm run maritime:heatmap:import -- services/maritime-api/examples/heatmap-snapshot.example.json
```

El servicio persiste celdas H3 agregadas y metadata diaria. No guarda posiciones AIS crudas por barco.

## Documentacion Interna

- Guia oficial del producto: `docs/GUIA_OFICIAL_SISLOPE.md`
- Decision tecnica maritime tracking: `docs/adr-maritime-tracking.md`
- Plan AIS/heatmap: `docs/TRACKING_MARITIMO_AIS_PLAN.md`
- Deploy Railway maritime: `docs/RAILWAY_MARITIME_HEATMAP_DEPLOY.md`

## Rol En Data Trade

SisLoPe debe converger hacia:

- misma cuenta que ADEX Palletizer mediante `apps/api`
- tracking interno en `data_trade.events`
- eventos geoespaciales como `module_opened`, `map_layer_toggled`, `search_performed`
- consumo de contratos `trade-case.v1` y `trade-costs.v1` cuando se crucen casos logisticos y costos
