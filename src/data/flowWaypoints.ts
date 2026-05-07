/**
 * Road waypoints for Peru's major terrestrial logistics corridors.
 *
 * Each entry snaps a node-to-node flow to the actual highway geometry,
 * replacing the generic Bezier offset used when no waypoints are present.
 * Coordinates are [lon, lat] in WGS-84 (same convention as everything else).
 *
 * Map key: sorted nodeId pair joined with "|" (e.g. "callao|la-oroya").
 * Use `makeWaypointKey(a, b)` from geo.ts to build a key at runtime.
 */

export type WaypointKey = string

/** Build the canonical (sorted) key for a pair of node IDs. */
export function makeWaypointKey(a: string, b: string): WaypointKey {
  return [a, b].sort().join('|')
}

// Shorthand: [lon, lat]
type Coord = readonly [number, number]

const W = new Map<WaypointKey, readonly Coord[]>()
function w(a: string, b: string, pts: readonly Coord[]): void {
  W.set(makeWaypointKey(a, b), pts)
}

// ─────────────────────────────────────────────────────────────────────────────
// CORREDORES TERRESTRES ADUANA -> ADUANA
w('aduana-callao-maritima', 'aduana-callao-aerea', [
  [-77.12, -12.04],
])

w('aduana-tumbes', 'aduana-paita', [
  [-80.52, -4.20],
  [-80.69, -4.90],
  [-80.63, -5.19],
])

w('aduana-paita', 'aduana-la-tina', [
  [-80.63, -5.19],
  [-80.47, -4.90],
  [-79.99, -4.64],
])

w('aduana-paita', 'aduana-chiclayo', [
  [-80.63, -5.19],
  [-80.02, -5.98],
])

w('aduana-chiclayo', 'aduana-salaverry', [
  [-79.30, -7.56],
  [-79.02, -8.08],
])

w('aduana-salaverry', 'aduana-chimbote', [
  [-78.65, -8.84],
])

w('aduana-chimbote', 'aduana-chancay', [
  [-78.18, -10.06],
  [-77.78, -10.79],
  [-77.52, -11.10],
])

w('aduana-chancay', 'aduana-callao-maritima', [
  [-77.18, -11.77],
  [-77.12, -11.88],
])

w('aduana-callao-maritima', 'aduana-pisco', [
  [-76.58, -12.55],
  [-76.39, -13.08],
  [-75.75, -13.42],
])

w('aduana-pisco', 'aduana-arequipa', [
  [-75.73, -14.07],
  [-74.94, -14.83],
  [-74.23, -15.84],
  [-72.71, -16.62],
])

w('aduana-arequipa', 'aduana-mollendo', [
  [-71.76, -16.78],
])

w('aduana-mollendo', 'aduana-ilo', [
  [-71.34, -17.64],
  [-70.97, -17.14],
])

w('aduana-ilo', 'aduana-tacna', [
  [-70.97, -17.14],
  [-70.35, -17.54],
  [-70.27, -17.93],
])

w('aduana-tacna', 'aduana-santa-rosa', [
  [-70.26, -18.21],
])

w('aduana-arequipa', 'aduana-puno', [
  [-71.08, -15.38],
  [-70.73, -15.62],
  [-70.02, -15.84],
])

w('aduana-puno', 'aduana-desaguadero', [
  [-69.47, -16.13],
])

w('aduana-arequipa', 'aduana-cusco', [
  [-71.08, -15.38],
  [-70.73, -15.21],
  [-71.06, -14.85],
])

w('aduana-cusco', 'aduana-puerto-maldonado', [
  [-71.62, -13.69],
  [-70.74, -13.22],
  [-70.04, -12.95],
])

// CORREDORES TERRESTRES ADUANA / HUB INTERIOR
w('aduana-tumbes', 'sullana-hub', [
  [-80.52, -4.20],
])

w('aduana-paita', 'piura-hub', [
  [-80.63, -5.19],
])

w('aduana-la-tina', 'piura-hub', [
  [-79.99, -4.64],
  [-80.47, -4.90],
])

w('sullana-hub', 'piura-hub', [
  [-80.63, -5.19],
])

w('piura-hub', 'chiclayo-hub', [
  [-80.02, -5.98],
])

w('piura-hub', 'cajamarca-trepaderas', [
  [-79.84, -6.77],
  [-79.18, -7.02],
])

w('chiclayo-hub', 'trujillo-hub', [
  [-79.30, -7.56],
])

w('trujillo-hub', 'cajamarca-trepaderas', [
  [-78.59, -8.06],
])

w('aduana-salaverry', 'trujillo-hub', [
  [-79.01, -8.10],
])

w('aduana-chiclayo', 'chiclayo-hub', [
  [-79.84, -6.77],
])

w('aduana-chimbote', 'trujillo-hub', [
  [-78.65, -8.84],
])

w('aduana-callao-maritima', 'lurin', [
  [-77.04, -12.14],
  [-76.95, -12.22],
])

w('lurin', 'ves', [
  [-76.90, -12.24],
])

w('aduana-callao-maritima', 'la-oroya', [
  [-76.71, -12.01],
  [-76.40, -11.84],
  [-76.22, -11.91],
])

w('aduana-pucallpa', 'la-oroya', [
  [-74.99, -8.85],
  [-75.99, -9.30],
  [-76.24, -9.93],
  [-76.26, -10.69],
])

w('aduana-pisco', 'ica-hub', [
  [-76.11, -13.71],
])

w('ica-hub', 'arequipa-hub', [
  [-74.94, -14.83],
  [-73.25, -15.92],
  [-72.71, -16.62],
])

w('aduana-arequipa', 'arequipa-hub', [
  [-71.52, -16.41],
])

w('arequipa-hub', 'juliaca-hub', [
  [-71.08, -15.38],
  [-70.73, -15.62],
])

w('arequipa-hub', 'moquegua-hub', [
  [-71.18, -16.84],
])

w('aduana-ilo', 'moquegua-hub', [
  [-70.97, -17.14],
])

w('aduana-tacna', 'moquegua-hub', [
  [-70.27, -17.93],
  [-70.35, -17.54],
  [-70.97, -17.14],
])

w('aduana-puno', 'juliaca-hub', [
  [-70.07, -15.70],
])

w('aduana-desaguadero', 'juliaca-hub', [
  [-69.47, -16.13],
  [-70.02, -15.84],
])

w('aduana-cusco', 'cusco-hub', [
  [-71.97, -13.53],
])

w('cusco-hub', 'aduana-puerto-maldonado', [
  [-71.62, -13.69],
  [-70.74, -13.22],
  [-70.04, -12.95],
])

w('aduana-tarapoto', 'moyobamba-hub', [
  [-76.64, -6.22],
])

// CARRETERA CENTRAL — Callao → La Oroya → sierra / selva central
// ─────────────────────────────────────────────────────────────────────────────
// Ruta 22: Callao → Chosica → Matucana → Casapalca → La Oroya
w('callao', 'la-oroya', [
  [-76.71, -12.01],  // Chosica / Chaclacayo
  [-76.40, -11.84],  // Matucana
  [-76.22, -11.91],  // San Mateo / Casapalca pass (~4 200 m)
])

// La Oroya → Cerro de Pasco → Huánuco → Tingo María → Aguaytía → Pucallpa
// (rama norte de la Carretera Central; NO pasa por Tarma/La Merced)
w('la-oroya', 'pucallpa-port', [
  [-76.26, -10.69],  // Cerro de Pasco
  [-76.24, -9.93],   // Huánuco
  [-75.99, -9.30],   // Tingo María
  [-74.99, -8.85],   // Aguaytía
])

// La Oroya → Concepción → Huancayo (Mantaro valley, ~60 km)
w('la-oroya', 'huancayo-hub', [
  [-75.55, -11.65],  // Concepción
])

// Callao → La Oroya → Huancayo (no waypoints directos → via La Oroya)
w('callao', 'huancayo-hub', [
  [-76.71, -12.01],  // Chosica
  [-76.40, -11.84],  // Matucana
  [-76.22, -11.91],  // Casapalca
  [-75.90, -11.52],  // La Oroya
  [-75.55, -11.65],  // Concepción
])

// ─────────────────────────────────────────────────────────────────────────────
// PANAMERICANA NORTE — Ruta 1N (Lima → Trujillo → Chiclayo → Piura → Tumbes)
// ─────────────────────────────────────────────────────────────────────────────
w('callao', 'chancay', [
  [-77.22, -11.86],  // Huacho area
])

w('chancay', 'chimbote', [
  [-77.52, -11.10],  // Huacho / Supe
  [-77.78, -10.79],  // Paramonga
  [-78.18, -10.06],  // Casma
])

w('chimbote', 'trujillo-hub', [
  [-78.65, -8.84],   // Virú
])

w('salaverry', 'trujillo-hub', [
  [-79.01, -8.10],   // Trujillo ciudad
])

w('trujillo-hub', 'chiclayo-hub', [
  [-79.30, -7.56],   // Guadalupe / Pacasmayo
  [-79.72, -7.16],   // Entre Chiclayo y Trujillo
])

w('chiclayo-hub', 'piura-hub', [
  [-80.02, -5.98],   // Olmos
])

w('piura-hub', 'aguas-verdes-cebaf', [
  [-80.69, -4.90],   // Sullana
  [-80.52, -4.20],   // Zarumilla
])

w('la-tina', 'piura-hub', [
  [-79.99, -4.64],   // Suyo / Las Lomas
  [-80.47, -4.90],   // Empalme con ruta a Sullana
])

w('alamor', 'sullana-hub', [
  [-80.30, -4.61],   // Lancones / Poechos corridor
])

w('alamor', 'piura-hub', [
  [-80.30, -4.61],   // Lancones / Poechos corridor
  [-80.69, -4.90],   // Sullana
])

// ─────────────────────────────────────────────────────────────────────────────
// CORREDOR NORTE ANDINO — Piura / Paita → Cajamarca → costa norte
// ─────────────────────────────────────────────────────────────────────────────
// Ruta principal: Paita → Piura → Chiclayo → Cajamarca (Ruta 3N)
// NO pasa por Jaén (ese es un ramal norte más largo)
w('paita', 'cajamarca-trepaderas', [
  [-80.63, -5.19],   // Piura ciudad
  [-79.84, -6.77],   // Chiclayo
  [-79.18, -7.02],   // Chongoyape / entrada sierra
])

// Cajamarca → Trujillo / Salaverry (Ruta 3 sur: Otuzco)
w('cajamarca-trepaderas', 'salaverry', [
  [-78.59, -8.06],   // Otuzco
])

// Cajamarca → La Tina (ruta frontera Ecuador vía Jaén / San Ignacio)
w('cajamarca-trepaderas', 'la-tina', [
  [-78.99, -5.57],   // San Ignacio
  [-79.48, -4.87],   // Foothills de Ayabaca
])

w('cajamarca-trepaderas', 'la-balsa', [
  [-78.99, -5.57],   // San Ignacio
  [-79.08, -5.00],   // Namballe
])

w('la-balsa', 'la-tina', [
  [-79.08, -5.00],   // Namballe
  [-78.99, -5.57],   // San Ignacio
  [-79.48, -4.87],   // Foothills de Ayabaca
])

// ─────────────────────────────────────────────────────────────────────────────
// PANAMERICANA SUR — Ruta 1S (Lima → Ica → Arequipa → Moquegua → Tacna)
// ─────────────────────────────────────────────────────────────────────────────
w('callao', 'general-san-martin', [
  [-76.58, -12.55],  // Cañete / San Vicente
  [-76.39, -13.08],  // Cañete sur
  [-75.75, -13.42],  // Chincha Alta
])

w('general-san-martin', 'ica-hub', [
  [-76.11, -13.71],  // Pisco ciudad
])

w('ica-hub', 'marcona', [
  [-75.73, -14.83],  // Nazca
  [-75.16, -15.37],  // San Juan de Marcona
])

// Arequipa → Camaná (costa) → Nazca → Marcona
w('arequipa-hub', 'marcona', [
  [-72.71, -16.62],  // Camaná (empalme costero)
  [-74.23, -15.84],  // Chala
  [-75.16, -15.37],  // Marcona
])

w('ica-hub', 'matarani', [
  [-74.94, -14.83],  // Nazca
  [-73.25, -15.92],  // Norte de Camaná
  [-72.71, -16.62],  // Camaná
])

w('matarani', 'arequipa-hub', [
  [-71.76, -16.78],  // Repartición / Patahuasi
  [-71.57, -16.41],  // Entrando a Arequipa
])

w('arequipa-hub', 'juliaca-hub', [
  [-71.08, -15.38],  // Imata (paso 4 500 m)
  [-70.73, -15.62],  // Aproximación Juliaca
])

w('juliaca-hub', 'desaguadero', [
  [-70.02, -15.84],  // Puno ciudad
  [-69.47, -16.13],  // Ilave
])

w('arequipa-hub', 'moquegua-hub', [
  [-71.18, -16.84],  // Pampa Blanca / Toquepala
])

w('moquegua-hub', 'ilo', [
  [-70.97, -17.14],  // Descenso Moquegua → Ilo
])

w('ilo', 'zofratacna', [
  [-70.35, -17.54],  // Costanera Ilo → Tacna
  [-70.27, -17.93],  // Ingreso Tacna
])

w('ilo', 'santa-rosa', [
  [-70.35, -17.54],
  [-70.28, -17.92],  // Periferia Tacna
])

w('zofratacna', 'santa-rosa', [
  [-70.26, -18.21],  // ZOFRATACNA → complejo fronterizo Santa Rosa
])

// ─────────────────────────────────────────────────────────────────────────────
// INTEROCEÁNICA SUR — Ruta 26 (Cusco → Puerto Maldonado → Iñapari → Brasil)
// ─────────────────────────────────────────────────────────────────────────────
w('cusco-hub', 'puerto-maldonado-port', [
  [-71.62, -13.69],  // Urcos
  [-70.74, -13.22],  // Quince Mil (bajada a selva)
  [-70.04, -12.95],  // Mazuko
])

w('inapari', 'puerto-maldonado-port', [
  [-69.50, -11.40],  // Iberia
])

// Cusco → Iñapari (ruta directa: via Puerto Maldonado)
w('cusco-hub', 'inapari', [
  [-71.62, -13.69],  // Urcos
  [-70.74, -13.22],  // Quince Mil
  [-70.04, -12.95],  // Mazuko
  [-69.19, -12.59],  // Puerto Maldonado
  [-69.50, -11.40],  // Iberia
])

// Cusco → Juliaca → sur andino
w('cusco-hub', 'juliaca-hub', [
  [-71.06, -14.85],  // Sicuani
  [-70.73, -15.21],  // Ayaviri
])

// ─────────────────────────────────────────────────────────────────────────────
// PUNO / ALTIPLANO — Titicaca y corredor Bolivia
// ─────────────────────────────────────────────────────────────────────────────
w('puno-port', 'juliaca-hub', [
  [-70.07, -15.70],  // Puno → Juliaca
])

w('juliaca-hub', 'kasani', [
  [-69.56, -15.95],  // Orilla del Titicaca hacia Kasani
])

// ─────────────────────────────────────────────────────────────────────────────
// AMAZONIA NORTE — Corredor Tarapoto / Yurimaguas
// ─────────────────────────────────────────────────────────────────────────────
w('tarapoto-airport', 'yurimaguas', [
  [-76.50, -6.24],   // Descenso a Yurimaguas
])

w('moyobamba-hub', 'tarapoto-airport', [
  [-76.64, -6.22],   // Moyobamba → Tarapoto
])

export const FLOW_WAYPOINTS: ReadonlyMap<WaypointKey, readonly Coord[]> = W
