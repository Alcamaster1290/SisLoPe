# maritime-api

Servicio ligero de lectura y administracion maritima para SisLoPe. Expone dos read-models desacoplados:

- tracking por embarque/buque
- heatmap diario de flota maritima/fluvial

El servicio no consulta proveedores AIS desde requests de usuario. La sincronizacion pesada entra por scripts o workers externos.

## Desarrollo local

```bash
npm install
npm run dev
```

Variables requeridas:

```bash
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
npm run heatmap:import -- examples/heatmap-snapshot.example.json
npm run heatmap:sync:gfw
npm run heatmap:sync:gfw:dry-run
```

## Heatmap diario GFW

La fuente inicial recomendada es `Global Fishing Watch / public-global-presence:latest`.

El sync diario:

1. descarga una capa agregada oficial
2. la agrega a H3
3. persiste solo celdas diarias resumidas

No guarda posiciones AIS crudas por barco.

Variables relevantes del worker:

```bash
GFW_API_TOKEN=
GFW_HEATMAP_LAG_DAYS=4
GFW_HEATMAP_H3_RESOLUTION=5
GFW_HEATMAP_SPATIAL_RESOLUTION=LOW
GFW_HEATMAP_VESSEL_TYPES=
```

Si quieres validar la fuente sin tocar Postgres:

```bash
npm run heatmap:sync:gfw:dry-run
```

## Despliegue

- Runtime previsto: Railway
- Base de datos: Postgres gestionado en Railway
- `rootDir`: `services/maritime-api`
- Archivo API: `services/maritime-api/railway.api.json`
- Archivo worker/cron: `services/maritime-api/railway.worker.json`
- `services/maritime-api/railway.json` queda como alias del API
- Checklist completa: `docs/RAILWAY_MARITIME_HEATMAP_DEPLOY.md`
- El frontend Vercel no debe consumir el servicio hasta validar datos y cobertura en preview
