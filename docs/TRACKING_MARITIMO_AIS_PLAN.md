# SisLoPe — Integracion AIS maritima segura

## 1. Auditoria breve del estado actual del proyecto
- `SisLoPe` hoy es una SPA `Vite + React 19` desplegada en Vercel como hosting estatico.
- El repo no tiene backend, ORM, base de datos, auth, cron, colas ni serverless.
- El dato operativo actual vive en `src/data/*` y se consume via `logisticsRepository`.
- El flujo principal es `src/data/* -> logisticsRepository -> useFilteredLogisticsData -> App -> LogisticsMap / FiltersPanel / MapLegend / SidePanel`.
- `useMapStore` es estado de UI/camara/render; no debe usarse como storage de tracking maritimo.
- `LogisticsMap.tsx` es el punto mas acoplado del producto y no debe absorber logica AIS en Fase 1.

## 2. Plan por fases
- `Fase 0`: cerrar arquitectura, contratos, modelo y rollout.
- `Fase 1`: introducir boundary maritimo en frontend, apagado por feature flag y sin trafico real.
- `Fase 2`: crear servicio ligero externo y Postgres gestionado con tablas nuevas.
- `Fase 3`: crear worker externo para sincronizacion AIS con snapshots resumidos.
- `Fase 4`: activar UX operativa de tracking por embarque, sin convertir el mapa Peru en una vista de flota viva.

## 3. Arquitectura recomendada
- Vercel se mantiene como capa web ligera.
- La lectura del tracking se hace desde un read model externo y cacheable.
- La sincronizacion AIS pesada vive fuera de Vercel.
- El modelo inicial recomendado es `snapshots resumidos por embarque/buque`, no AIS crudo.
- El frontend consume un boundary explicito (`MaritimeTrackingReadService`) para no acoplarse al proveedor ni al backend futuro.

## 4. Riesgos y tradeoffs
- Riesgo principal: binding incorrecto `shipment <-> vessel (IMO/MMSI)`.
- Tradeoff principal: snapshots resumidos reducen granularidad forense, pero simplifican costo, volumen y operacion.
- Riesgo de performance: el bundle cartografico ya es pesado; cualquier UI maritima debe quedar fuera del hot path del mapa principal.
- Riesgo de UX: no mezclar infraestructura fija con activos moviles en una misma capa global.
- Riesgo de despliegue: intentar resolver AIS solo con esta SPA y Vercel degradaria mantenibilidad y control operativo.

## 5. Propuesta de ampliacion del modelo de datos
- Entidades nuevas previstas:
  - `maritime_shipments`
  - `maritime_vessels`
  - `maritime_ports`
  - `maritime_shipment_vessel_assignments`
  - `maritime_tracking_snapshots`
  - `maritime_status_events`
  - `maritime_alerts`
  - `maritime_sync_runs`
- Campos obligatorios:
  - `shipment_ref`
  - `observed_at`
  - `provider_source`
  - `status_summary`
  - relacion valida a embarque y/o buque
- Campos opcionales:
  - `mmsi`
  - `eta`
  - `destination_port_id`
  - `sog`
  - `cog`
  - `destination_text`
- Migraciones seguras:
  - crear tablas nuevas en orden base -> snapshots/eventos/alertas -> indices/archival
  - no tocar ni renombrar estructuras existentes del producto actual
- Retencion:
  - snapshots activos cada `15-30 min`
  - retencion hot `90-180 dias`
  - compactacion posterior a diario o por cambio significativo
  - payload bruto solo fuera del DB principal y con TTL corto
- No almacenar:
  - cada posicion AIS cruda
  - payload completo del proveedor en tablas operativas
  - tracking de flotas sin vinculo a embarques del negocio
  - historico AIS en Zustand o `src/data/*`

## 6. Contratos backend
- Lectura:
  - `GET /api/maritime/shipments/:shipmentRef/summary`
  - `GET /api/maritime/shipments/:shipmentRef/latest-snapshot`
  - `GET /api/maritime/shipments/:shipmentRef/snapshots?window=7d`
  - `GET /api/maritime/shipments/:shipmentRef/alerts`
  - `GET /api/maritime/vessels/:imo/latest`
- Escritura ligera:
  - `POST /api/maritime/shipments/:shipmentRef/bind-vessel`
  - `POST /api/maritime/shipments/:shipmentRef/manual-refresh`
- Reglas:
  - el request del usuario nunca llama al proveedor AIS
  - la API sirve solo desde storage/caché
  - `summary/latest-snapshot` con TTL `60-300s`
  - `timeline` con TTL `5-15 min`
  - reintentos solo en worker externo con backoff exponencial

## 7. Plan frontend
- Boundary de Fase 1:
  - `src/types/maritime.ts`
  - `src/lib/maritimeTracking/service.ts`
  - `src/lib/maritimeTracking/adapters/noop.ts`
  - `src/lib/maritimeTracking/flags.ts`
- Integracion UX recomendada:
  - no agregar AIS como capa global del mapa de Peru
  - integrar tracking en `SidePanel` o panel contextual de nodos portuarios
  - orden de UI: estado, ultima posicion, ETA/destino, alertas, historial resumido
- Estados UX:
  - `loading`
  - `empty`
  - `degraded`
  - `error`
- Frecuencia:
  - sin polling continuo
  - solo revalidacion pasiva eventual y sobre vistas abiertas

## 8. Cambios implementados en esta iteracion
- Tipos maritimos base en `src/types/maritime.ts`.
- Interfaz `MaritimeTrackingReadService` en `src/lib/maritimeTracking/service.ts`.
- Adapter `noop` seguro y sin trafico real en `src/lib/maritimeTracking/adapters/noop.ts`.
- Feature flags en `src/lib/maritimeTracking/flags.ts`.
- `MaritimeTrackingPanel` opcional y lazy, conectado al `SidePanel` solo bajo flag y solo para nodos maritimos/fluviales.
- ADR tecnica en `docs/adr-maritime-tracking.md`.
- Actualizacion de `.env.example` y `README.md`.
- Tests nuevos para flags, adapter y contratos de tipos.

## 9. Archivos modificados
- `.env.example`
- `README.md`
- `docs/adr-maritime-tracking.md`
- `docs/TRACKING_MARITIMO_AIS_PLAN.md`
- `src/components/map/SidePanel.tsx`
- `src/components/maritime/MaritimeTrackingPanel.tsx`
- `src/lib/maritimeTracking/service.ts`
- `src/lib/maritimeTracking/flags.ts`
- `src/lib/maritimeTracking/adapters/noop.ts`
- `src/lib/maritimeTracking/flags.test.ts`
- `src/lib/maritimeTracking/adapters/noop.test.ts`
- `src/types/maritime.ts`
- `src/types/maritime.test.ts`

## 10. Que quedo pendiente para una Fase 2
- Servicio ligero externo real.
- Esquema Postgres no destructivo.
- Worker externo de sincronizacion AIS.
- Binding operativo embarque↔buque con validacion `IMO/MMSI`.
- Conexion de la SPA al read model real con cache.
- Reglas operativas especificas para puertos como `Callao` y `Chancay`.
- Feature flags separados para summary textual y mapa maritimo en rollout productivo.
