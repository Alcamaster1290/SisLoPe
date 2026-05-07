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
// CORREDOR CENTRAL — Carretera Central (Lima/Callao → La Oroya → Pucallpa)
// ─────────────────────────────────────────────────────────────────────────────
// Route 22: Lima → Chosica → Matucana → San Mateo → La Oroya
w('callao', 'la-oroya', [
  [-76.71, -12.01],  // Chosica / Chaclacayo junction
  [-76.40, -11.84],  // Matucana
  [-76.22, -11.91],  // San Mateo / Casapalca pass
])

// La Oroya → Tarma → La Merced → Huánuco → Tingo María → Pucallpa
w('la-oroya', 'pucallpa-port', [
  [-75.69, -11.42],  // Tarma
  [-75.32, -11.05],  // La Merced (Valle del Perené)
  [-76.24, -9.93],   // Huánuco
  [-75.99, -9.30],   // Tingo María
  [-74.99, -8.85],   // Aguaytía
])

// ─────────────────────────────────────────────────────────────────────────────
// PANAMERICANA NORTE — Ruta 1N (Lima → Trujillo → Chiclayo → Piura → Tumbes)
// ─────────────────────────────────────────────────────────────────────────────
w('callao', 'chancay', [
  [-77.22, -11.86],  // Huacho area (coast highway)
])

w('chancay', 'chimbote', [
  [-77.52, -11.10],  // Huacho / Supe
  [-77.78, -10.79],  // Paramonga
  [-78.18, -10.06],  // Casma
])

w('chimbote', 'trujillo-hub', [
  [-78.65, -8.84],   // Virú corridor
])

w('salaverry', 'trujillo-hub', [
  [-79.01, -8.10],   // Trujillo city approach
])

w('trujillo-hub', 'chiclayo-hub', [
  [-79.30, -7.56],   // Guadalupe / Pacasmayo vicinity
  [-79.72, -7.16],   // Between Chiclayo and Trujillo
])

w('chiclayo-hub', 'piura-hub', [
  [-80.02, -5.98],   // Olmos pass
])

w('piura-hub', 'aguas-verdes-cebaf', [
  [-80.69, -4.90],   // Sullana
  [-80.52, -4.20],   // Zarumilla approach
])

w('la-tina', 'piura-hub', [
  [-79.99, -4.64],   // Suyo / Las Lomas
  [-80.47, -4.90],   // Highway junction
])

// ─────────────────────────────────────────────────────────────────────────────
// PANAMERICANA SUR — Ruta 1S (Lima → Ica → Arequipa → Moquegua → Tacna)
// ─────────────────────────────────────────────────────────────────────────────
w('callao', 'general-san-martin', [
  [-76.58, -12.55],  // Cañete / San Vicente
  [-76.39, -13.08],  // Cañete south
  [-75.75, -13.42],  // Chincha Alta
])

w('general-san-martin', 'ica-hub', [
  [-76.11, -13.71],  // Pisco city
])

w('ica-hub', 'marcona', [
  [-75.73, -14.83],  // Nazca
  [-75.16, -15.37],  // San Juan de Marcona approach
])

w('ica-hub', 'matarani', [
  [-74.94, -14.83],  // Nazca
  [-73.25, -15.92],  // Camaná area
  [-72.71, -16.62],  // Camaná
])

w('matarani', 'arequipa-hub', [
  [-71.76, -16.78],  // Repartición / Patahuasi
  [-71.57, -16.41],  // Approaching Arequipa
])

w('arequipa-hub', 'juliaca-hub', [
  [-71.08, -15.38],  // Imata (4,500 m pass)
  [-70.73, -15.62],  // Approaching Juliaca
])

w('juliaca-hub', 'desaguadero', [
  [-70.02, -15.84],  // Puno city
  [-69.47, -16.13],  // Ilave
])

w('arequipa-hub', 'moquegua-hub', [
  [-71.18, -16.84],  // Pampa Blanca / Toquepala pass
])

w('moquegua-hub', 'ilo', [
  [-70.97, -17.14],  // Moquegua to Ilo descent
])

w('ilo', 'zofratacna', [
  [-70.35, -17.54],  // Ilo → Tacna coastal highway
  [-70.27, -17.93],  // Approaching Tacna
])

w('ilo', 'santa-rosa', [
  [-70.35, -17.54],
  [-70.28, -17.92],  // Tacna outskirts
])

w('zofratacna', 'santa-rosa', [
  [-70.26, -18.21],  // ZOFRATACNA → Santa Rosa (Tacna border complex)
])

// ─────────────────────────────────────────────────────────────────────────────
// INTEROCEÁNICA SUR — Ruta 26 (Cusco → Puerto Maldonado → Iñapari → Brazil)
// ─────────────────────────────────────────────────────────────────────────────
w('cusco-hub', 'puerto-maldonado-port', [
  [-71.62, -13.69],  // Urcos
  [-70.74, -13.22],  // Quince Mil (jungle descent)
  [-70.04, -12.95],  // Mazuko
])

w('inapari', 'puerto-maldonado-port', [
  [-69.50, -11.40],  // Iberia
])

// ─────────────────────────────────────────────────────────────────────────────
// CORREDOR NORTE ANDINO (Paita / Piura → Cajamarca → Trujillo)
// ─────────────────────────────────────────────────────────────────────────────
w('paita', 'cajamarca-trepaderas', [
  [-80.63, -5.19],   // Piura city
  [-79.75, -6.00],   // Olmos
  [-78.80, -5.71],   // Jaén
])

w('cajamarca-trepaderas', 'salaverry', [
  [-78.51, -7.16],   // Contumaza / Tembladera junction
  [-78.59, -8.06],   // Otuzco
])

w('cajamarca-trepaderas', 'la-tina', [
  [-78.99, -5.57],   // San Ignacio
  [-79.48, -4.87],   // Ayabaca foothills
])

// ─────────────────────────────────────────────────────────────────────────────
// AMAZONIA NORTE — Corredor Yurimaguas / Tarapoto
// ─────────────────────────────────────────────────────────────────────────────
w('tarapoto-airport', 'yurimaguas', [
  [-76.50, -6.24],   // Highway descending to Yurimaguas
])

w('moyobamba-hub', 'tarapoto-airport', [
  [-76.64, -6.22],   // Highway Moyobamba → Tarapoto
])

// ─────────────────────────────────────────────────────────────────────────────
// PUNO / ALTIPLANO — Sur andino
// ─────────────────────────────────────────────────────────────────────────────
w('puno-port', 'juliaca-hub', [
  [-70.07, -15.70],  // Puno → Juliaca (short highway)
])

w('juliaca-hub', 'kasani', [
  [-69.56, -15.95],  // Juliaca → Kasani (Titicaca shore road)
])

w('cusco-hub', 'juliaca-hub', [
  [-71.06, -14.85],  // Sicuani area
  [-70.73, -15.21],  // Ayaviri
])

// ─────────────────────────────────────────────────────────────────────────────
// HUARMEY / CHIMBOTE lateral
// ─────────────────────────────────────────────────────────────────────────────
w('huarmey', 'la-oroya', [
  [-77.51, -10.31],  // Pativilca junction (Pan-Am)
  [-77.29, -10.70],  // Highway heading inland to Huaraz / La Oroya
  [-76.84, -11.10],  // Recuay area
  [-76.47, -11.50],  // Carhuaz / Approaching La Oroya via Recuay
])

export const FLOW_WAYPOINTS: ReadonlyMap<WaypointKey, readonly Coord[]> = W
