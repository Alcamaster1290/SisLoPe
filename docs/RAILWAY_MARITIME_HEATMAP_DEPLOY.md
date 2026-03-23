# Railway deploy - heatmap diario GFW

## Fuente elegida

Se eligio **Global Fishing Watch 4Wings API** con el dataset oficial `public-global-presence:latest`.

Motivos:

1. Es oficial y esta orientado a **presencia AIS agregada**, no a tracking vessel-by-vessel.
2. Permite **reportes JSON por region** con `hours`, `lat`, `lon` y `vesselIDs`, lo que encaja con el heatmap diario.
3. Evita scraping, tiles raster o polling desde el frontend.

Documentacion oficial usada:

- https://globalfishingwatch.org/platform-update/global-ais-vessel-presence-dataset/
- https://globalfishingwatch.org/our-apis/documentation
- https://docs.railway.com/config-as-code/reference
- https://docs.railway.com/cron-jobs

## Limitaciones operativas

1. La capa de presencia AIS esta disponible hasta **96 horas atras**. Por eso el worker usa `GFW_HEATMAP_LAG_DAYS=4`.
2. La capa es **referencial** y la cobertura fluvial debe tratarse como parcial.
3. Antes de ir a prod, valida que el uso previsto de SisLoPe sea compatible con los terminos de acceso de Global Fishing Watch.

## Servicios Railway

Configuracion recomendada:

1. servicio HTTP `maritime-api`
   - Root Directory: `services/maritime-api`
   - Config file path: `/services/maritime-api/railway.api.json`
   - `services/maritime-api/railway.json` queda como alias del API
   - `watchPatterns`: `services/maritime-api/**`

2. cron job diario para el sync GFW
   - puede correr sobre el mismo servicio `maritime-api`
   - comando: `npm run heatmap:sync:gfw`
   - horario sugerido: `15 10 * * *` UTC
   - si prefieres un servicio separado de worker, usa:
     - Root Directory: `services/maritime-api`
     - Config file path: `/services/maritime-api/railway.worker.json`
     - `watchPatterns`: `services/maritime-api/**`

## Variables de entorno minimas

### Compartidas

- `DATABASE_URL`
- `NODE_ENV=production`
- `FRONTEND_ORIGIN=https://tu-frontend`
- `MARITIME_ENABLE_WRITE_ENDPOINTS=true`
- `MARITIME_ADMIN_API_KEY=...`

### Solo worker / sincronizacion

- `GFW_BASE_URL=https://gateway.api.globalfishingwatch.org`
- `GFW_API_TOKEN=...`
- `GFW_HEATMAP_SPATIAL_RESOLUTION=LOW`
- `GFW_HEATMAP_SOURCE_NAME=global-fishing-watch-public-presence`
- `GFW_HEATMAP_H3_RESOLUTION=5`
- `GFW_HEATMAP_LAG_DAYS=4`

## Checklist de deploy

1. Crear `Postgres` en Railway.
2. Crear servicio `maritime-api`.
3. Configurar `Root Directory` a `services/maritime-api`.
4. Asignar config path `/services/maritime-api/railway.api.json`.
5. Cargar variables compartidas y conectar `DATABASE_URL`.
6. Ejecutar migraciones:
   - `npm run maritime:db:migrate`
7. Verificar:
   - `GET /health`
   - `GET /ready`
   - `GET /api/maritime/heatmap/latest`
8. Crear servicio `maritime-heatmap-worker`.
   Alternativa recomendada: crear un cron job diario sobre `maritime-api` con el mismo comando de sync.
9. Si usas servicio separado, configurar `Root Directory` a `services/maritime-api`.
10. Si usas servicio separado, asignar config path `/services/maritime-api/railway.worker.json`.
11. Configurar el cron diario a `15 10 * * *` UTC si no usas el config worker.
12. Cargar las variables compartidas y las de GFW.
13. Ejecutar una corrida manual:
   - `npm run heatmap:sync:gfw -- --date=2026-03-19`
14. Si quieres validar sin DB, correr:
   - `npm run heatmap:sync:gfw -- --date=2026-03-19 --dry-run`
15. Verificar en DB que existan filas en:
   - `maritime_heatmap_runs`
   - `maritime_heatmap_daily_cells`
16. Verificar que `GET /api/maritime/heatmap/daily?date=2026-03-19` devuelva celdas.
17. En Vercel, definir:
   - `VITE_ENABLE_MARITIME_TRACKING=true`
   - `VITE_ENABLE_MARITIME_TRACKING_MAP=true`
   - `VITE_MARITIME_API_BASE_URL=https://tu-maritime-api`
18. Probar el toggle `Heatmap de flota` en preview antes de activar prod.

## Runbook rapido

### Backfill de una fecha puntual

```bash
npm run maritime:heatmap:sync:gfw -- --date=2026-03-19
```

### Dry run contra GFW sin escribir en DB

```bash
npm run maritime:heatmap:sync:gfw -- --date=2026-03-19 --dry-run
```

### Import manual de fixture local

```bash
npm run maritime:heatmap:import -- services/maritime-api/examples/heatmap-snapshot.example.json
```
