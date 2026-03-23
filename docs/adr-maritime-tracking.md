# ADR — Boundary de tracking maritimo para SisLoPe

## Estado
Aceptado para Fase 1.

## Contexto
`SisLoPe` hoy es una SPA Vite/React desplegada en Vercel como sitio estatico. El repo no tiene backend, base de datos, auth, cron ni workers. El dato operativo actual vive en `src/data/*` y se expone via `logisticsRepository`.

El producto necesita integrar seguimiento maritimo internacional sin:
- polling frecuente desde cliente
- consultas directas al proveedor AIS
- almacenamiento indiscriminado de posiciones AIS crudas
- acoplar Vercel al rol de motor de sincronizacion

## Decision
La Fase 1 introduce un **boundary maritimo** en frontend, apagado por feature flag:

- `src/types/maritime.ts`
- `src/lib/maritimeTracking/service.ts`
- `src/lib/maritimeTracking/adapters/noop.ts`
- `src/lib/maritimeTracking/flags.ts`

La SPA sigue consumiendo solo el dataset actual. El tracking maritimo real se conectara mas adelante a traves de un **read model externo** y un **worker externo** que sincronice snapshots resumidos por embarque/buque.

## Consecuencias
- No se rompe el flujo actual del mapa ni del store.
- No se introduce trafico real ni dependencia del proveedor AIS.
- El repo queda listo para conectar una API ligera externa sin redisenar la UX.
- La integracion futura debe mantener a Vercel como capa web ligera y dejar la ingesta pesada fuera de este repo.

## Fuera de alcance en Fase 1
- Backend real
- Postgres
- Migraciones
- Worker de sincronizacion
- mapa maritimo activo
- polling o refresh automatico frecuente
