# SisLoPe

SisLoPe constituye un centro de mando geoespacial para el sistema logistico y aduanero del Peru. La aplicacion integra React, TypeScript y Vite con MapLibre, Deck.gl, Three.js, D3, Turf y Zustand en una interfaz operacional de alto contraste y trazabilidad territorial.

La ejecucion local inicia con:

```bash
npm install
npm run dev
```

La verificacion tecnica de calidad utiliza:

```bash
npm run lint
npm run test
npm run build
```

La configuracion del estilo base del mapa admite una URL externa mediante la variable `VITE_MAP_STYLE_URL`. Si la variable permanece vacia, el sistema adopta el fallback oscuro interno sin token.

```bash
VITE_MAP_STYLE_URL=https://tu-style.json
```

## Tracking maritimo y heatmap diario

El repo incorpora un boundary tecnico para dos extensiones maritimas desacopladas del mapa base:

- tracking por embarque/buque, apagado por feature flag
- heatmap diario de flota maritima/fluvial, preparado para renderizarse sobre Deck como capa referencial

La SPA no consulta proveedores AIS directamente. El flujo esperado es:

1. un job o worker externo consolida una fuente publica agregada
2. ese proceso importa un snapshot diario al `maritime-api`
3. el frontend consulta solo el read model resumido ya persistido

Variables de entorno preparadas:

```bash
VITE_ENABLE_MARITIME_TRACKING=false
VITE_ENABLE_MARITIME_TRACKING_MAP=false
VITE_MARITIME_API_BASE_URL=
```

Mientras `VITE_ENABLE_MARITIME_TRACKING=false`, el mapa principal no cambia su UX.

## maritime-api

El backend ligero vive en `services/maritime-api` y esta pensado para desplegarse aparte del frontend, por ejemplo en Railway con Postgres.

Comandos utiles:

```bash
npm run maritime:build
npm run maritime:test
npm run maritime:lint
npm run maritime:heatmap:sync:gfw
npm run maritime:heatmap:sync:gfw:dry-run
```

Importacion manual de un snapshot diario agregado:

```bash
npm run maritime:heatmap:import -- services/maritime-api/examples/heatmap-snapshot.example.json
```

El script inserta solo celdas agregadas H3 y metadata diaria. No guarda posiciones AIS crudas por barco.
La sincronizacion diaria recomendada usa `Global Fishing Watch / public-global-presence:latest` y se ejecuta desde `services/maritime-api`, no desde Vercel.
Si quieres validar el token/fuente sin tocar Postgres, usa el `dry-run`.

La decision arquitectonica y el alcance de esta fase estan documentados en `docs/adr-maritime-tracking.md`.
El plan maestro, contratos y hoja de ruta incremental quedaron documentados en `docs/TRACKING_MARITIMO_AIS_PLAN.md`.
La puesta en produccion del backend y del worker diario esta documentada en `docs/RAILWAY_MARITIME_HEATMAP_DEPLOY.md`.

El despliegue en Vercel queda configurado con `vercel.json`, con salida en `dist` y fallback SPA hacia `index.html` para rutas sin extension.

La guia oficial integral del producto, con arquitectura, cobertura territorial, taxonomia de nodos, leyendas, clases visuales, modos de visualizacion, reglas de interaccion, lineamientos de extension y marco de despliegue, reside en `docs/GUIA_OFICIAL_SISLOPE.md`.
