/**
 * Intendencias y agencias aduaneras de la SUNAT en el Perú.
 * Coordenadas geocodificadas a partir de las direcciones oficiales.
 */

export type SunatOfficeType =
  | 'intendencia_maritima'
  | 'intendencia_aerea'
  | 'intendencia_fronteriza'
  | 'intendencia_interior'
  | 'agencia'

export interface SunatOffice {
  id: string
  name: string
  shortName: string
  type: SunatOfficeType
  address: string
  region: string
  lat: number
  lon: number
}

export const sunatOffices: readonly SunatOffice[] = [
  // ──────────────────────────────────────────
  // Callao / Lima metropolitana
  // ──────────────────────────────────────────
  {
    id: 'callao-maritima',
    name: 'Intendencia de Aduana Marítima del Callao',
    shortName: 'Aduana Marítima Callao',
    type: 'intendencia_maritima',
    address: 'Av. Guardia Chalaca 149, Callao',
    region: 'Callao',
    lat: -12.056,
    lon: -77.148,
  },
  {
    id: 'callao-aerea',
    name: 'Intendencia de Aduana Aérea y Postal del Callao',
    shortName: 'Aduana Aérea Callao',
    type: 'intendencia_aerea',
    address: 'Sector D Centro Aéreo Comercial, Av. Faucett / Tomás Valle, Callao',
    region: 'Callao',
    lat: -12.022,
    lon: -77.108,
  },
  {
    id: 'chucuito',
    name: 'Sede Chucuito — Intendencia Aduana Marítima del Callao',
    shortName: 'Sede Chucuito',
    type: 'intendencia_maritima',
    address: 'Av. Gamarra 680, Chucuito, Callao',
    region: 'Callao',
    lat: -12.068,
    lon: -77.148,
  },
  {
    id: 'postal-lince',
    name: 'Agencia Postal de Lince',
    shortName: 'Postal Lince',
    type: 'agencia',
    address: 'Jr. Teodoro Cárdenas 265, Lince, Lima',
    region: 'Lima',
    lat: -12.086,
    lon: -77.035,
  },
  {
    id: 'postal-los-olivos',
    name: 'Agencia Postal de Los Olivos',
    shortName: 'Postal Los Olivos',
    type: 'agencia',
    address: 'Av. Tomás Valle Cdra. 7, Los Olivos, Lima',
    region: 'Lima',
    lat: -11.988,
    lon: -77.078,
  },
  // ──────────────────────────────────────────
  // Costa norte
  // ──────────────────────────────────────────
  {
    id: 'tumbes',
    name: 'Intendencia de Aduana de Tumbes',
    shortName: 'Aduana Tumbes',
    type: 'intendencia_fronteriza',
    address: 'Complejo Fronterizo Zarumilla, Tumbes',
    region: 'Tumbes',
    lat: -3.497,
    lon: -80.272,
  },
  {
    id: 'paita',
    name: 'Intendencia de Aduana de Paita',
    shortName: 'Aduana Paita',
    type: 'intendencia_maritima',
    address: 'Zona Industrial II, Paita, Piura',
    region: 'Piura',
    lat: -5.088,
    lon: -81.114,
  },
  {
    id: 'chiclayo',
    name: 'Intendencia de Aduana de Chiclayo',
    shortName: 'Aduana Chiclayo',
    type: 'intendencia_interior',
    address: 'Av. José Leonardo Ortiz 195, Chiclayo, Lambayeque',
    region: 'Lambayeque',
    lat: -6.771,
    lon: -79.841,
  },
  {
    id: 'salaverry',
    name: 'Intendencia de Aduana de Salaverry',
    shortName: 'Aduana Salaverry',
    type: 'intendencia_maritima',
    address: 'Esq. Av. La Marina y Gamarra, Salaverry, La Libertad',
    region: 'La Libertad',
    lat: -8.224,
    lon: -78.977,
  },
  {
    id: 'chimbote',
    name: 'Intendencia de Aduana de Chimbote',
    shortName: 'Aduana Chimbote',
    type: 'intendencia_maritima',
    address: 'Av. Francisco Bolognesi, Chimbote, Áncash',
    region: 'Áncash',
    lat: -9.074,
    lon: -78.594,
  },
  // ──────────────────────────────────────────
  // Costa centro
  // ──────────────────────────────────────────
  {
    id: 'chancay',
    name: 'Intendencia de Aduana de Chancay',
    shortName: 'Aduana Chancay',
    type: 'intendencia_maritima',
    address: 'Calle Marítimo 102–104, Chancay, Huaral, Lima',
    region: 'Lima',
    lat: -11.568,
    lon: -77.268,
  },
  {
    id: 'pisco',
    name: 'Intendencia de Aduana de Pisco',
    shortName: 'Aduana Pisco',
    type: 'intendencia_maritima',
    address: 'Av. Pérez Figueroa 112–118, Pisco, Ica',
    region: 'Ica',
    lat: -13.710,
    lon: -76.202,
  },
  // ──────────────────────────────────────────
  // Costa sur
  // ──────────────────────────────────────────
  {
    id: 'mollendo',
    name: 'Intendencia de Aduana de Mollendo',
    shortName: 'Aduana Mollendo',
    type: 'intendencia_maritima',
    address: 'Av. Túpac Amaru 102, Mollendo, Arequipa',
    region: 'Arequipa',
    lat: -17.023,
    lon: -72.014,
  },
  {
    id: 'ilo',
    name: 'Intendencia de Aduana de Ilo',
    shortName: 'Aduana Ilo',
    type: 'intendencia_maritima',
    address: 'Av. Venecia S/N, Ilo, Moquegua',
    region: 'Moquegua',
    lat: -17.638,
    lon: -71.337,
  },
  {
    id: 'tacna',
    name: 'Intendencia de Aduana de Tacna',
    shortName: 'Aduana Tacna',
    type: 'intendencia_fronteriza',
    address: 'Parque Industrial, Pocollay, Tacna',
    region: 'Tacna',
    lat: -18.006,
    lon: -70.243,
  },
  // ──────────────────────────────────────────
  // Amazonia
  // ──────────────────────────────────────────
  {
    id: 'iquitos',
    name: 'Intendencia de Aduana de Iquitos',
    shortName: 'Aduana Iquitos',
    type: 'intendencia_interior',
    address: 'Av. 28 de Julio 810, Punchana, Iquitos, Loreto',
    region: 'Loreto',
    lat: -3.742,
    lon: -73.247,
  },
  {
    id: 'pucallpa',
    name: 'Intendencia de Aduana de Pucallpa',
    shortName: 'Aduana Pucallpa',
    type: 'intendencia_interior',
    address: 'Av. Salvador Allende 130, Pucallpa, Ucayali',
    region: 'Ucayali',
    lat: -8.379,
    lon: -74.553,
  },
  {
    id: 'tarapoto',
    name: 'Intendencia de Aduana de Tarapoto',
    shortName: 'Aduana Tarapoto',
    type: 'intendencia_interior',
    address: 'Jr. Ramírez Hurtado 301, Tarapoto, San Martín',
    region: 'San Martín',
    lat: -6.485,
    lon: -76.361,
  },
  {
    id: 'puerto-maldonado',
    name: 'Intendencia de Aduana de Puerto Maldonado',
    shortName: 'Aduana Pto. Maldonado',
    type: 'intendencia_interior',
    address: 'Av. 26 de Diciembre 157, Puerto Maldonado, Madre de Dios',
    region: 'Madre de Dios',
    lat: -12.594,
    lon: -69.189,
  },
  // ──────────────────────────────────────────
  // Sierra
  // ──────────────────────────────────────────
  {
    id: 'cusco',
    name: 'Intendencia de Aduana de Cusco',
    shortName: 'Aduana Cusco',
    type: 'intendencia_interior',
    address: 'Calle Santa Teresa 366, Cusco',
    region: 'Cusco',
    lat: -13.517,
    lon: -71.978,
  },
  {
    id: 'puno',
    name: 'Intendencia de Aduana de Puno',
    shortName: 'Aduana Puno',
    type: 'intendencia_fronteriza',
    address: 'Urb. El Carmen de Huaje, Puno',
    region: 'Puno',
    lat: -15.840,
    lon: -70.022,
  },
  // ──────────────────────────────────────────
  // Frontera terrestre norte
  // ──────────────────────────────────────────
  {
    id: 'la-tina',
    name: 'Agencia Aduanera La Tina',
    shortName: 'Aduana La Tina',
    type: 'agencia',
    address: 'Panamericana Norte Km. 1160, Suyo, Ayabaca, Piura',
    region: 'Piura',
    lat: -4.638,
    lon: -79.993,
  },
] as const
