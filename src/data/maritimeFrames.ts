export interface MaritimeFrameBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface MaritimeFrame {
  id: MaritimeFrameId;
  label: string;
  description: string;
  bounds: MaritimeFrameBounds;
}

export type MaritimeFrameId =
  | "peru-eez"
  | "north-coast"
  | "central-coast"
  | "south-coast";

export const MARITIME_FRAMES: readonly MaritimeFrame[] = [
  {
    id: "peru-eez",
    label: "Costa peruana completa",
    description:
      "Marco unificado para la zona maritima peruana con buffer offshore. Usar como filtro por defecto cuando no se requiera segmentar la flota.",
    bounds: { west: -84.0, south: -18.6, east: -70.2, north: 0.5 },
  },
  {
    id: "north-coast",
    label: "Costa norte",
    description:
      "Tumbes, Piura, Lambayeque y La Libertad. Cubre Talara, Paita, Bayovar, Eten y Salaverry.",
    bounds: { west: -82.5, south: -8.6, east: -78.5, north: 0.5 },
  },
  {
    id: "central-coast",
    label: "Costa centro",
    description:
      "Ancash, Lima e Ica. Cubre Chimbote, Huarmey, Callao, Chancay, General San Martin y Marcona.",
    bounds: { west: -82.0, south: -15.4, east: -75.6, north: -8.6 },
  },
  {
    id: "south-coast",
    label: "Costa sur",
    description:
      "Arequipa, Moquegua y Tacna. Cubre Mollendo, Matarani, Ilo y la frontera con Chile.",
    bounds: { west: -79.5, south: -18.5, east: -70.3, north: -15.4 },
  },
] as const;

export const DEFAULT_MARITIME_FRAME_ID: MaritimeFrameId = "peru-eez";

const FRAMES_BY_ID = new Map<MaritimeFrameId, MaritimeFrame>(
  MARITIME_FRAMES.map((frame) => [frame.id, frame]),
);

export function getMaritimeFrame(id: MaritimeFrameId): MaritimeFrame {
  const frame = FRAMES_BY_ID.get(id);
  if (!frame) {
    throw new Error(`Unknown maritime frame id: ${id}`);
  }
  return frame;
}

export function tryGetMaritimeFrame(id: string): MaritimeFrame | null {
  return FRAMES_BY_ID.get(id as MaritimeFrameId) ?? null;
}

// MarineTraffic, GFW and similar APIs accept a flat bbox tuple
// (MINLON, MINLAT, MAXLON, MAXLAT). This helper produces that shape directly.
export function toBoundingBoxTuple(
  bounds: MaritimeFrameBounds,
): [number, number, number, number] {
  return [bounds.west, bounds.south, bounds.east, bounds.north];
}
