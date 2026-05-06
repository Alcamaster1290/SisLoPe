# SisLoPe Maritime API

Servicio ligero de lectura y administracion maritima para SisLoPe. Expone read models desacoplados para tracking por embarque/buque y heatmap diario de flota maritima/fluvial.

Es un backend de dominio maritimo, no el backend general de Data Trade.

## Estado Actual

- Runtime: Node.js + Fastify.
- Base de datos: PostgreSQL.
- ORM/migraciones: Drizzle.
- Dominio: tracking por embarque/buque y heatmap diario maritimo/fluvial.
- Deploy previsto: Railway, separado del frontend Vercel.
- Integracion Data Trade: futura via eventos/ETL si se requiere trazabilidad central.

El servicio no consulta proveedores AIS desde requests de usuario. Las cargas pesadas entran por scripts o workers.

## Desarrollo Local

```bash
npm install
npm run dev
```

Variables requeridas:

```text
DATABASE_URL=postgres://...
MARITIME_ADMIN_API_KEY=...
FRONTEND_ORIGIN=http://localhost:5173
```

## Scripts

```bash
npm run lint
npm run test
npm run build
npm run db:generate
npm run db:migrate
npm run db:studio
npm run heatmap:import -- examples/heatmap-snapshot.example.json
npm run heatmap:sync:gfw
npm run heatmap:sync:gfw:dry-run
```

## Heatmap Diario GFW

Fuente inicial recomendada:

```text
Global Fishing Watch / public-global-presence:latest
```

El sync diario:

1. descarga una capa agregada oficial
2. agrega a H3
3. persiste solo celdas diarias resumidas

No guarda posiciones AIS crudas por barco.

Variables del worker:

```text
GFW_API_TOKEN=
GFW_HEATMAP_LAG_DAYS=4
GFW_HEATMAP_H3_RESOLUTION=5
GFW_HEATMAP_SPATIAL_RESOLUTION=LOW
GFW_HEATMAP_VESSEL_TYPES=
```

Validar fuente sin tocar PostgreSQL:

```bash
npm run heatmap:sync:gfw:dry-run
```

## Deploy

- Runtime previsto: Railway.
- Base de datos: PostgreSQL gestionado en Railway.
- Root directory: `services/maritime-api`.
- API service config: `railway.api.json`.
- Worker/cron config: `railway.worker.json`.
- `railway.json` queda como alias del API.
- Checklist: `../../docs/RAILWAY_MARITIME_HEATMAP_DEPLOY.md`.
- El frontend Vercel no debe consumir el servicio hasta validar datos y cobertura en preview.

## Relacion Con Data Trade API

`apps/api` es el backend comun para identidad, sesiones, eventos y admin. `maritime-api` debe mantenerse separado porque su dominio, jobs y datos son maritimos.

Posibles integraciones futuras:

- emitir eventos agregados a `apps/api /events/track`
- registrar fuentes en `data_trade.data_sources`
- exponer metricas operativas al dashboard admin si el modulo SisLoPe lo requiere
