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

El despliegue en Vercel queda configurado con `vercel.json`, con salida en `dist` y fallback SPA hacia `index.html` para rutas sin extension.

La guia oficial integral del producto, con arquitectura, cobertura territorial, taxonomia de nodos, leyendas, clases visuales, modos de visualizacion, reglas de interaccion, lineamientos de extension y marco de despliegue, reside en `docs/GUIA_OFICIAL_SISLOPE.md`.
