# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

SisLoPe is the geospatial module of the Data Trade ecosystem — an interactive map of Peru's logistics and customs infrastructure. It is a React/TypeScript SPA deployed on Vercel with a separate Fastify backend for maritime data (`services/maritime-api`).

## Commands

### Frontend (root)

```bash
npm install       # install dependencies
npm run dev       # dev server (Vite)
npm run build     # tsc --noEmit && vite build
npm run lint      # eslint
npm run test      # vitest run (jsdom, includes all src/**/*.test.{ts,tsx})
npm run test:watch
```

Run a single test file:
```bash
npx vitest run src/store/useMapStore.test.ts
```

### maritime-api (run from repo root)

```bash
npm run maritime:dev          # tsx watch src/server.ts
npm run maritime:build
npm run maritime:test
npm run maritime:lint
npm run maritime:db:generate  # drizzle-kit generate
npm run maritime:db:migrate   # drizzle-kit migrate
npm run maritime:heatmap:import -- services/maritime-api/examples/heatmap-snapshot.example.json
npm run maritime:heatmap:sync:gfw
npm run maritime:heatmap:sync:gfw:dry-run
```

## Architecture

### Rendering Stack

`LogisticsMap.tsx` composes three rendering systems in layers:

1. **MapLibre GL** — base map, Peru boundary, department regions, node clusters, native map layers
2. **Deck.gl** (`DeckCanvasOverlay.tsx`) — `ScatterplotLayer`/`PathLayer`/`TextLayer` for nodes, flows, and labels; `HexagonLayer` for density view; fleet heatmap layer
3. **Three.js** (`ThreeNodeOverlay.tsx`) — 3D node rendering, active only in `emphasis3d` view mode

All three must stay in sync. `mapLayoutSync.ts` handles viewport synchronization; `buildMapRenderSyncState` produces the shared `MapRenderSyncState`. Render health per subsystem (`maplibre`, `deck`, `three`) is tracked in the store and surfaced by `RenderStatusOverlay.tsx`.

### State Management

`src/store/useMapStore.ts` is the single Zustand store for all map state: filters, camera, node selection, view mode, UI toggles, presentation mode, and export state.

**Camera commands** are issued via `requestCameraCommand` which stamps a `nonce: Date.now()` so downstream effects fire even when the command shape is identical. Kinds: `"focus"`, `"reset"`, `"fitBounds"`.

**`ActionOrigin`** (`"user"` | `"presentation"` | `"system"`) matters: any action with origin `"user"` calls `pausePresentationOnUserAction`, which auto-pauses an active presentation tour. System-origin actions (e.g., deselecting filtered nodes) do not pause it.

### Data Layer

`src/data/index.ts` exports `logisticsRepository` — the single access point for nodes, flows, and nodeMap. At module initialization it calls `buildCompletedFlows`, which synthesizes additional land flows from `node.connections` between `aduana`/`inland_hub` nodes not already covered by explicit flows in `src/data/flows.ts`.

All static logistics data lives in `src/data/nodes.ts` and `src/data/flows.ts`. Department-to-node mapping and geographic bounds are in `src/data/departments.ts` and `src/data/departmentRegions.ts`.

### Auth (Dual-Mode)

Auth is selected at runtime based on `VITE_DATA_TRADE_API_URL`:

- **Data Trade mode** (preferred): `authApi.ts` calls `VITE_DATA_TRADE_API_URL/auth/*` with Bearer tokens stored in module-level variables (`accessToken`, `refreshToken`). Supports handoff codes from ADEX via `?handoff=<code>` → `POST /auth/handoff/exchange`.
- **Legacy fallback**: calls Vercel serverless functions at `/api/auth/*` (`api/auth/login.ts`, `api/auth/me.ts`, `api/auth/logout.ts`), which authenticate against the shared Neon PostgreSQL (`public.usuarios` / `public.auth_sessions`).

Guest mode sets `localStorage['sislope_data_trade_anonymous_id']` and bypasses the API check entirely. `AuthProvider` reads this flag synchronously before the first render to avoid a flash.

Do not add a second login screen or a "Data Trade account" panel. The SisLoPe login is the only entry point.

### Maritime Feature Flags

Maritime tracking is fully gated by three env vars read in `src/lib/maritimeTracking/flags.ts`:

```
VITE_ENABLE_MARITIME_TRACKING=false
VITE_ENABLE_MARITIME_TRACKING_MAP=false
VITE_MARITIME_API_BASE_URL=
```

`heatmapEnabled` requires all three to be set/true. When disabled, `noopMaritimeFleetHeatmapReadService` is used and the main map UX is unchanged. The frontend never queries AIS providers directly; it only reads aggregated H3 cell snapshots from `maritime-api`.

### maritime-api Service

Fastify app in `services/maritime-api/src/`. Structure:

- `app.ts` — `buildApp()` factory; accepts injectable dependencies for testing
- `routes/` — `health.ts`, `maritime.ts`, `maritimeHeatmap.ts`
- `services/` — `maritimeReadService.ts`, `maritimeHeatmapReadService.ts` (LRU-cached read models)
- `repositories/` — Drizzle ORM queries against PostgreSQL
- `db/schema/maritime.ts` — all table definitions; heatmap uses H3 grid cells (`maritimeHeatmapDailyCells`)
- `scripts/` — `importHeatmapSnapshot.ts`, `syncGfwHeatmapDaily.ts`

The service stores aggregated H3 cells per day (`snapshotDate`), not raw AIS positions. Tests use `@electric-sql/pglite` as in-process Postgres.

## Key Conventions

### TypeScript Imports

Type-only imports must use `import type { ... }` (enforced by ESLint `@typescript-eslint/consistent-type-imports`). This applies to both the frontend and maritime-api.

### Path Alias

`@` resolves to `src/` in both `vite.config.ts` and `vitest.config.ts`. Use `@/` for all internal imports in frontend code.

### Formatting

Prettier: double quotes, semicolons, trailing commas (`prettier.config.cjs`). ESLint extends `eslint-config-prettier` to disable conflicting rules.

### Layer Factories

`src/layers/createNodeLayers.ts`, `createFlowLayers.ts`, and `createMaritimeFleetHeatmapLayer.ts` are pure functions that return Deck.gl layer instances. Keep them free of store/hook calls — they receive all required data as arguments and are tested independently.

### View Modes

`MapViewMode`: `"standard"` | `"emphasis3d"` | `"flows"` | `"density"`. Each mode changes layer visibility, camera presets (`getModeCameraPreset` in `utils/geo.ts`), and node rendering profiles (`getNodeModeProfile` in `createNodeLayers.ts`).

## Environment Variables

See `.env.example` for the full list. Minimum for local frontend dev:

```
VITE_USE_INLINE_FALLBACK_STYLE=true   # uses built-in dark map style, no token needed
VITE_ENABLE_MARITIME_TRACKING=false
```

For Data Trade auth integration:
```
VITE_DATA_TRADE_API_URL=http://localhost:8788
VITE_DATA_TRADE_TRACKING_ENABLED=true
VITE_DATA_TRADE_MODULE_CODE=sislope
```

For legacy auth (Vercel serverless), set `DATABASE_URL` in the environment.

## Deploy

- **Frontend**: Vercel SPA with `vercel.json` rewriting all routes to `index.html`.
- **maritime-api**: Railway with PostgreSQL (see `docs/RAILWAY_MARITIME_HEATMAP_DEPLOY.md`).
- **Build chunks**: `map` (MapLibre + Deck.gl), `geo` (Turf + D3), `motion` (Framer Motion) — defined in `vite.config.ts`.
