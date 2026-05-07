# Auditoria de precision de coordenadas de nodos

Fecha: 2026-05-07

## Alcance

Se reviso el ultimo commit de coordenadas, `1f5fe4d fix(data): correct GPS coordinates for ports, aduanas and border crossings`, y se itero sobre los 87 nodos definidos en `src/data/nodes.ts`.

Distribucion auditada:

| Categoria | Nodos |
| --- | ---: |
| `aduana` | 25 |
| `airport` | 13 |
| `border` | 8 |
| `freezone` | 4 |
| `inland_hub` | 15 |
| `port_river` | 6 |
| `port_sea` | 16 |

## Fuentes y metodo

- OpenStreetMap/Nominatim reverse geocoding: validacion de pais y localidad para los 87 nodos.
- OpenStreetMap/Overpass API: busqueda de objetos OSM nombrados para puertos, pasos fronterizos y aduanas fronterizas cuando el reverse geocoding devolvia un objeto vecino.
- OurAirports `airports.csv`: validacion de los 13 aeropuertos por codigo IATA.
- SUNAT dependencias/oficinas aduaneras: contraste de intendencias y agencias aduaneras nacionales.
- SUNAT Procedimiento General de Transito Aduanero Internacional CAN-ALADI: contraste de pasos fronterizos autorizados y aduanas habilitadas.

Referencias:

- https://nominatim.org/release-docs/latest/api/Reverse/
- https://overpass-api.de/
- https://ourairports.com/data/
- https://www.sunat.gob.pe/institucional/quienessomos/dependenciasoficinas_ad.html
- https://www.sunat.gob.pe/legislacion/superin/2020/anexo-172-2020.pdf

## Resultado de la iteracion completa

- Nodos procesados con Nominatim reverse: 87/87.
- Nodos con `country_code` distinto de Peru: 0.
- Puertos maritimos contrastados contra objetos OSM costeros nombrados: 16/16.
- Aeropuertos contrastados contra OurAirports: 13/13.
- Aeropuertos con desviacion mayor a 0.5 km contra OurAirports: 0.
- Desviacion maxima de aeropuerto: 0.224 km (`juliaca-airport`).
- Santa Rosa queda en el Complejo Aduanero Santa Rosa, Tacna, no en Chacalluta.
- La Tina, Kasani y Aduana La Tina quedan en puntos del lado peruano.

## Correcciones aplicadas

| Nodo | Coordenada anterior | Coordenada nueva | Evidencia usada |
| --- | --- | --- | --- |
| `callao` | `-12.04684, -77.14271` | `-12.0510604, -77.1457171` | OSM way `Terminal Portuario del Callao`, alt `Puerto del Callao` |
| `chancay` | `-11.59038, -77.27617` | `-11.5922989, -77.2800097` | OSM way `Puerto de Chancay`, official `Terminal Portuario Multiproposito de Chancay` |
| `paita` | `-5.0894, -81.1144` | `-5.0830285, -81.1063466` | OSM way `Terminales Portuarios Euroandinos`, alt `Puerto de Paita` |
| `talara` | `-4.5789, -81.2719` | `-4.5769472, -81.2802052` | OSM way `Capitania de Puerto de Talara` |
| `bayovar` | `-5.8, -81.03` | `-5.7983065, -81.0513131` | OSM way `Puerto de Miski Mayo` |
| `eten` | `-6.93, -79.87` | `-6.9357781, -79.8683267` | OSM way `Muelle de Puerto Eten` |
| `salaverry` | `-8.22843, -78.98083` | `-8.232145, -78.9807666` | OSM way `Terminal Portuario Salaverry` |
| `pacasmayo` | `-7.4, -79.57` | `-7.3981947, -79.5734335` | OSM way `Pacasmayo`, `man_made=pier` |
| `chimbote` | `-9.0767, -78.6147` | `-9.0749813, -78.606215` | OSM way `Terminal Portuario de Chimbote` |
| `huarmey` | `-10.0681, -78.1522` | `-10.1032782, -78.1789965` | OSM way `Puerto Punta Lobitos - Antamina` |
| `general-san-martin` | `-13.80446, -76.29303` | `-13.8026159, -76.2925897` | OSM way `Puerto General San Martin` |
| `marcona` | `-15.365, -75.16` | `-15.3625545, -75.1661988` | OSM way `Capitania de Puerto de San Juan` |
| `melchorita` | `-13.2451, -76.297` | `-13.2441865, -76.2976204` | OSM way `Planta Pampa Melchorita` |
| `matarani` | `-17.000, -72.10639` | `-16.9975739, -72.1036668` | OSM node `Tisur` |
| `mollendo` | `-17.0231, -72.0147` | `-17.0304821, -72.0156227` | OSM way `Capitania de Puerto de Mollendo` |
| `ilo` | `-17.64741, -71.34805` | `-17.6437539, -71.3458775` | OSM way `Muelle Fiscal` |
| `arequipa-airport` | `-16.3411, -71.5831` | `-16.340786, -71.569485` | OurAirports IATA `AQP`, Nominatim `Aeropuerto Internacional Alfredo Rodriguez Ballon` |
| `la-tina` | `-4.38985, -79.96397` | `-4.3924646, -79.9661874` | OSM node `Control Macara`, Peru-side border control |
| `kasani` | `-16.2097, -69.0847` | `-16.2267014, -69.0954432` | OSM node `Puesto de Control Fronterizo de Kasani`, Peru-side locality |
| `aduana-la-tina` | `-4.38985, -79.96397` | `-4.3923982, -79.9660719` | OSM node `Aduanas`, Suyo/Ayabaca/Piura |

## Observaciones

- Nominatim reverse identifica la direccion u objeto mas cercano, no necesariamente el poligono exacto del activo logistico. Por eso, para puertos y controles fronterizos se priorizo Overpass con `nwr["name"]` y coordenadas `out center`.
- Varias intendencias aduaneras se representan como oficinas urbanas o sedes regionales, no como patios operativos. La cobertura SUNAT valida su existencia y direccion, pero no siempre entrega coordenada GPS exacta.
- Los pasos fronterizos autorizados revisados por SUNAT incluyen Aguas Verdes, La Tina, El Alamor, Santa Rosa, Desaguadero e Inapari. El dataset conserva esos pasos y tambien mantiene nodos complementarios como La Balsa y Kasani para cobertura logistica.
