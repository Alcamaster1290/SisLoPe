# Guia oficial SISLOPE

## Marco institucional

SISLOPE opera como sistema de inteligencia visual para la red logistica y aduanera del Peru. La plataforma integra cartografia, trazabilidad nodal, lectura de corredores y contexto operativo en una sola experiencia de mando. El diseño sostiene una estetica tactica de baja luminosidad, con contraste alto, profundidad controlada y semantica cromatica estable, de modo que la lectura regional conserve claridad durante sesiones prolongadas.

La base tecnica actual responde a una arquitectura de cliente unico sobre Vite y React con TypeScript estricto. MapLibre controla el lienzo cartografico principal, Deck.gl administra capas analiticas de nodos, textos y corredores, Three.js aporta realce puntual en el modo de enfasis tridimensional, Turf determina operaciones espaciales y D3 sostiene escalas cuantitativas de color, opacidad y tamano. Zustand centraliza estado global y Framer Motion modula transiciones de interfaz.

## Arquitectura de aplicacion y estructura de carpetas

La carpeta `src/app` contiene la orquestacion de vista y el ensamblaje de layout general. La carpeta `src/components/map` concentra la cartografia operativa, con componentes dedicados a mapa, tooltip, leyenda, panel lateral, filtros, estado de render y overlays dedicados de Deck y Three. La carpeta `src/components/ui` conserva la barra superior y su sistema de controles estrategicos. La carpeta `src/data` aloja nodos, flujos, departamentos, regiones, limites nacionales y pruebas de consistencia territorial. La carpeta `src/hooks` encapsula filtrado, deteccion de escritorio y recorrido de presentacion. La carpeta `src/layers` define la construccion de capas para nodos y flujos. La carpeta `src/lib` encapsula estilo de mapa, exportacion de vista y adaptadores de entorno. La carpeta `src/store` formaliza el estado global. La carpeta `src/types` define contratos tipados. La carpeta `src/utils` concentra colorimetria, geometrias y formato textual. La carpeta `src/styles` define tokens visuales y clases tacticas.

La aplicacion mantiene separacion clara de responsabilidad. El componente principal invoca filtros, mapa, leyenda y panel lateral sin acoplamiento circular. El store concentra mutaciones de estado de camara, seleccion, salud de render y modo de presentacion. Las capas geoespaciales surgen desde funciones puras en `src/layers`, lo cual sostiene escalabilidad y facilita extension hacia nuevas capas tematicas.

## Modelo tipado y clases funcionales

El contrato tipado central nace en `src/types/logistics.ts`. La clase conceptual de categoria nodal incluye `port_sea`, `port_river`, `airport`, `border`, `freezone`, `inland_hub` y `corridor_anchor`. El nivel estrategico se expresa con `national`, `regional` y `complementary`. La macrozona contempla `north`, `center`, `south`, `amazon` y `border`. El terreno contempla `coast`, `highlands`, `jungle` y `lake`. El contrato de flujo adopta `land`, `sea` y `river`, con importancia `primary` y `secondary`.

El estado global formaliza filtros activos, departamento seleccionado, departamento en hover, modo de vista, profundidad de tema, visibilidad de etiquetas, visibilidad de flujos, visibilidad de corredores, nodo en hover, nodo seleccionado, salud de render por subsistema y secuencia de presentacion. El contrato de salud de render diferencia `maplibre`, `deck` y `three`, con estados agregados `loading`, `ready`, `degraded` y `failed`.

## Cobertura territorial oficial por departamento

La vista departamental trabaja con veinticuatro departamentos y geometria real de poligonos. La cobertura oficial incluye Amazonas, Ancash, Apurimac, Arequipa, Ayacucho, Cajamarca, Cusco, Huancavelica, Huanuco, Ica, Junin, La Libertad, Lambayeque, Lima, Loreto, Madre de Dios, Moquegua, Pasco, Piura, Puno, San Martin, Tacna, Tumbes y Ucayali. El sistema consolida Callao bajo Lima para navegacion departamental y mantiene la region Callao en el dato nodal, de forma que la capa departamental conserve continuidad administrativa sin perdida de detalle logistico.

La seleccion departamental opera desde panel y desde mapa. El estado `selectedDepartment` conserva sincronizacion unica entre ambos puntos de entrada. El mapa ejecuta `fitBounds` sobre bbox real del departamento con padding adaptado al layout de paneles y conserva transicion suave entre contexto nacional y contexto regional.

## Inventario oficial de lugares y nodos del sistema

La red actual contiene sesenta nodos. La clase de puerto maritimo agrupa Puerto del Callao, Puerto de Chancay, Puerto de Paita, Puerto de Talara, Puerto de Bayovar, Puerto de Eten, Puerto de Salaverry, Puerto de Pacasmayo, Puerto de Chimbote, Puerto de Huarmey, Puerto General San Martin, Puerto San Juan de Marcona, Terminal Melchorita, Puerto de Matarani, Puerto de Mollendo y Puerto de Ilo.

La clase de puerto fluvial agrupa Puerto de Iquitos, Puerto de Nauta, Puerto de Yurimaguas, Puerto de Pucallpa, Puerto Maldonado y Puerto de Puno.

La clase aeroportuaria agrupa Aeropuerto Jorge Chavez, Aeropuerto de Piura, Aeropuerto de Chiclayo, Aeropuerto de Trujillo, Aeropuerto de Pisco, Aeropuerto de Arequipa, Aeropuerto de Juliaca, Aeropuerto del Cusco, Aeropuerto de Tacna, Aeropuerto de Iquitos, Aeropuerto de Pucallpa, Aeropuerto de Tarapoto y Aeropuerto de Puerto Maldonado.

La clase fronteriza y CEBAF agrupa Complejo Fronterizo Santa Rosa, Desaguadero, CEBAF Tumbes / Aguas Verdes, La Tina, Inapari y Kasani.

La clase de zona franca y zona economica especial agrupa ZOFRATACNA, ZED Paita, ZED Ilo y ZED Matarani.

La clase de hub interior agrupa Piura, Sullana, Chiclayo, Trujillo, Cajamarca / Trepaderas, Lurin, Villa El Salvador, La Oroya, Huancayo, Ica, Arequipa, Moquegua, Juliaca, Cusco y Moyobamba.

La clase `corridor_anchor` permanece disponible en el modelo para escenarios de ampliacion, aunque el dataset inicial no registra nodos activos en esa clase.

## Red oficial de flujos y corredores

La coleccion de flujos contiene veintidos rutas iniciales. El modo terrestre integra Callao hacia Jorge Chavez, Callao hacia Lurin, Callao hacia La Oroya, Paita hacia ZED Paita, Paita hacia Piura, Paita hacia Cajamarca / Trepaderas, Salaverry hacia Trujillo, Salaverry hacia Cajamarca / Trepaderas, Matarani hacia Arequipa, Matarani hacia Juliaca, Matarani hacia Desaguadero, Ilo hacia ZED Ilo, Ilo hacia Moquegua, Ilo hacia Santa Rosa, ZOFRATACNA hacia Santa Rosa, Pucallpa hacia La Oroya, Puerto Maldonado hacia Inapari, Cusco hacia Puerto Maldonado y Juliaca hacia Desaguadero.

El modo maritimo integra Callao hacia Chancay. El modo fluvial integra Iquitos hacia Nauta e Iquitos hacia Yurimaguas. Cada flujo conserva identificador, origen, destino, modo, importancia, animacion y bidireccionalidad cuando aplica.

La construccion geometrica aplica curva bezier sobre linea base con punto de control dependiente del modo de flujo. La lectura visual mantiene coherencia de escala mediante perfiles de zoom que corrigen ancho, opacidad, altura de arco, largo de estela y pulso animado. El modo `flows` intensifica lectura de red; el modo `emphasis3d` reduce expresion de flujo y privilegia jerarquia nodal; el modo `density` atenua flujo y resalta concentracion.

## Sistema visual, leyenda y clases de interfaz

La leyenda operacional toma `CATEGORY_META` como fuente semantica y conserva conteo por categoria en tiempo real. La codificacion oficial define azul para `port_sea`, cian para `port_river`, morado para `airport`, rojo para `border`, verde para `freezone`, naranja para `inland_hub` y amarillo para `corridor_anchor`. La leyenda de corredores diferencia terrestre, maritimo y fluvial mediante gradientes lineales y grosor controlado.

La interfaz utiliza clases tacticas de superficie y control. La clase `app-shell` conserva fondo, atmosfera y malla sutil. La clase `panel-shell` sostiene contenedores operativos con transparencia, borde y blur. La clase `panel-shell-strong` eleva jerarquia de bloques principales. La clase `control-pill` unifica accion de toggles y botones de mando. La clase `thin-scrollbar` normaliza desplazamiento vertical en paneles de filtros y detalle. El sistema de tokens CSS en `src/styles/index.css` define superficies, bordes, tipografia, sombras y estados de tema `dark` y `deep-dark`.

## Politica de etiquetas, lectura espacial y trazabilidad de nombre

La politica de etiquetas responde a legibilidad por zoom. Debajo de z6 no aparecen etiquetas. Entre z6 y z6.8 la vista prioriza puertos y nodos en foco. Entre z6.8 y z7.6 la vista incorpora nodos nacionales y regionales del departamento activo. Por encima de z7.6 la vista habilita etiquetas completas de categorias filtradas. El sistema proyecta posiciones de texto en pantalla, resuelve lado izquierdo o derecho por posicion relativa y descarta solapes por prioridad.

La trazabilidad nombre punto se sostiene con conectores de flujo suave en la capa `node-label-flux`. Cada conector une coordenada real y ancla de texto con curva corta semitransparente, lo cual evita desfase perceptivo entre etiqueta y posicion geografica.

## Modos de visualizacion y consistencia 2D 3D

El modo `standard` mantiene equilibrio entre nodos, etiquetas y corredores. El modo `emphasis3d` incrementa peso visual de nodos nacionales y regionales con halo adicional y apoyo de Three en overlay desacoplado. El modo `flows` eleva presencia de arcos, estelas y animacion progresiva. El modo `density` activa `HexagonLayer` para lectura de concentracion territorial y reduce protagonismo de elementos puntuales.

La consistencia entre 2D y 3D queda sostenida por perfil compartido de camara, por calibracion por zoom y por reglas de degradacion. Si el subsistema Three pierde contexto, la vista retorna a capa 2D sin interrupcion de mapa base y sin perdida de paneles. Si Deck presenta falla temporal, MapLibre mantiene base y capa de contingencia de nodos.

## Interaccion oficial de usuario

El hover aplica realce suave y tooltip. El click fija nodo, abre panel lateral y conserva estado operativo. El doble click aplica acercamiento enfocado en nodo con ajuste de pitch segun modo activo. El boton de cierre del panel lateral usa una `X` y restaura camara previa cuando existe snapshot; en ausencia de snapshot, el sistema retorna a vista nacional de Peru. El boton `Reset camera` ejecuta retorno nacional controlado. Los botones de zoom lateral aplican incrementos inmediatos sobre la camara actual.

El modo de presentacion recorre secuencia oficial en Callao, Chancay, Paita, Matarani, Ilo, ZOFRATACNA y Desaguadero. Cualquier interaccion manual pausa la secuencia y preserva continuidad de estado para reanudacion posterior.

## Preparacion para integracion con API y Postgres PostGIS

La capa de datos se concentra en `src/data/index.ts` y mantiene desacople respecto a vista y capas. Esta decision permite sustitucion por servicio API sin alteraciones estructurales en componentes de interfaz. La conversion a GeoJSON ya existe en utilidades de `src/utils/geo.ts`, por lo que el acople con respuestas de backend mantiene baja complejidad. El modelo tipado en `src/types/logistics.ts` funciona como contrato comun para cliente y servicios externos.

## Operacion local y despliegue en Vercel

La operacion local parte desde raiz de proyecto y se completa con instalacion de dependencias y servidor de desarrollo de Vite. El despliegue en Vercel ya dispone de `vercel.json` con framework `vite`, comando de construccion `npm run build`, salida `dist` y regla de reescritura SPA para rutas sin extension. La variable `VITE_MAP_STYLE_URL` admite estilo externo y la ausencia de esa variable mantiene fallback tokenless de mapa base. Esta configuracion permite migracion directa de entorno local a entorno gestionado sin cambios de codigo.

```bash
npm install
npm run dev
npm run lint
npm run test
npm run build
```

## Gobierno tecnico y mantenimiento

El proyecto conserva trazabilidad funcional por pruebas unitarias en utilidades geoespaciales, capas de nodos, capas de flujo, store y mapeo departamental. La evolucion recomendada mantiene el mismo principio de aislamiento por capa, de manera que nuevas metricas de comercio exterior, volumen, tiempo de transito, ranking aduanero o proyectos estrategicos se incorporen sin regresiones en la experiencia de uso.

Esta guia queda establecida como referencia oficial de SISLOPE para operacion, extension y despliegue institucional.
