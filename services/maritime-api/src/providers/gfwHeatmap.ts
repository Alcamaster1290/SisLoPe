import { cellToBoundary, cellToLatLng, latLngToCell } from "h3-js";
import type { MaritimeHeatmapSnapshotImport } from "../contracts/maritimeHeatmap.js";

export const GFW_PUBLIC_PRESENCE_DATASET = "public-global-presence:latest";
export const GFW_PUBLIC_PRESENCE_SOURCE_NAME = "global-fishing-watch-public-presence";
export const GFW_PUBLIC_PRESENCE_SOURCE_URL =
  "https://globalfishingwatch.org/our-apis/documentation";
export const DEFAULT_GFW_BASE_URL = "https://gateway.api.globalfishingwatch.org";
export const DEFAULT_GFW_LAG_DAYS = 4;
export const DEFAULT_GFW_H3_RESOLUTION = 5;
export const DEFAULT_GFW_SPATIAL_RESOLUTION = "LOW";
export const DEFAULT_GFW_TIMEOUT_MS = 180_000;
export const DEFAULT_GFW_LAST_REPORT_POLL_MS = 15_000;
export const DEFAULT_GFW_LAST_REPORT_ATTEMPTS = 24;
export const DEFAULT_GFW_COVERAGE_NOTE =
  "Cobertura referencial de Global Fishing Watch, parcial en corredores fluviales y con latencia aproximada de 96 horas.";

interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

interface CoverageZone {
  kind: "maritime" | "fluvial";
  bounds: BoundingBox;
}

interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

interface GeoJsonMultiPolygon {
  type: "MultiPolygon";
  coordinates: number[][][][];
}

export type GfwHeatmapGeoJson = GeoJsonPolygon | GeoJsonMultiPolygon;
export type GfwSpatialResolution = "LOW" | "HIGH";

export interface GfwHeatmapSyncOptions {
  apiToken: string;
  baseUrl?: string;
  snapshotDate: string;
  geojson?: GfwHeatmapGeoJson;
  sourceName?: string;
  sourceUrl?: string;
  dataset?: string;
  coverageKind?: MaritimeHeatmapSnapshotImport["coverageKind"];
  qualityBand?: MaritimeHeatmapSnapshotImport["qualityBand"];
  coverageNote?: string;
  h3Resolution?: number;
  spatialResolution?: GfwSpatialResolution;
  vesselTypes?: string[];
  timeoutMs?: number;
  pollIntervalMs?: number;
  pollAttempts?: number;
  fetchImpl?: typeof fetch;
}

interface GfwReportEntry {
  lat: number;
  lon: number;
  hours: number;
  vesselIDs?: number;
}

interface GfwReportResponse {
  entries?: Array<Record<string, GfwReportEntry[]>>;
  status?: string;
  uri?: string;
}

function addUtcDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function toIsoDateUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function computeLatestAvailableSnapshotDate(
  referenceDate: Date = new Date(),
  lagDays = DEFAULT_GFW_LAG_DAYS,
): string {
  return toIsoDateUtc(addUtcDays(referenceDate, -lagDays));
}

export function buildDailyDateRange(snapshotDate: string): string {
  const nextDate = addUtcDays(new Date(`${snapshotDate}T00:00:00.000Z`), 1);
  return `${snapshotDate},${toIsoDateUtc(nextDate)}`;
}

export const PERU_FLEET_HEATMAP_GEOJSON: GfwHeatmapGeoJson = {
  type: "Polygon",
  coordinates: [
    [
      [-84, 2],
      [-67, 2],
      [-67, -22],
      [-84, -22],
      [-84, 2],
    ],
  ],
};

const DEFAULT_PERU_COVERAGE_ZONES: CoverageZone[] = [
  {
    kind: "maritime",
    bounds: {
      west: -84,
      south: -20.8,
      east: -74.4,
      north: -3.3,
    },
  },
  {
    kind: "fluvial",
    bounds: {
      west: -76.8,
      south: -13.2,
      east: -68.5,
      north: -3.2,
    },
  },
];

export function buildGfwHeatmapReportUrl({
  baseUrl = DEFAULT_GFW_BASE_URL,
  snapshotDate,
  dataset = GFW_PUBLIC_PRESENCE_DATASET,
  spatialResolution = DEFAULT_GFW_SPATIAL_RESOLUTION,
  vesselTypes = [],
}: Pick<
  GfwHeatmapSyncOptions,
  "baseUrl" | "snapshotDate" | "dataset" | "spatialResolution" | "vesselTypes"
>): string {
  const url = new URL("/v3/4wings/report", baseUrl);
  url.searchParams.set("spatial-resolution", spatialResolution);
  url.searchParams.set("temporal-resolution", "ENTIRE");
  url.searchParams.set("spatial-aggregation", "false");
  url.searchParams.set("format", "JSON");
  url.searchParams.set("datasets[0]", dataset);
  url.searchParams.set("date-range", buildDailyDateRange(snapshotDate));

  if (vesselTypes.length > 0) {
    const quotedTypes = vesselTypes.map((value) => `"${value}"`).join(",");
    url.searchParams.set("filters[0]", `vessel_type in (${quotedTypes})`);
  }

  return url.toString();
}

function getFetchImplementation(fetchImpl?: typeof fetch): typeof fetch {
  return fetchImpl ?? fetch;
}

function parseMaybeJson(text: string): unknown {
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function readResponse(response: Response): Promise<unknown> {
  return parseMaybeJson(await response.text());
}

async function waitFor(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isReportRunning(payload: unknown): payload is { status: string } {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      "status" in payload &&
      typeof (payload as { status: string }).status === "string",
  );
}

async function pollLastReport({
  baseUrl = DEFAULT_GFW_BASE_URL,
  apiToken,
  pollIntervalMs = DEFAULT_GFW_LAST_REPORT_POLL_MS,
  pollAttempts = DEFAULT_GFW_LAST_REPORT_ATTEMPTS,
  fetchImpl,
}: Pick<
  GfwHeatmapSyncOptions,
  "baseUrl" | "apiToken" | "pollIntervalMs" | "pollAttempts" | "fetchImpl"
>): Promise<GfwReportResponse> {
  const fetcher = getFetchImplementation(fetchImpl);
  const url = new URL("/v3/4wings/last-report", baseUrl);

  for (let attempt = 0; attempt < pollAttempts; attempt += 1) {
    const response = await fetcher(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Global Fishing Watch last-report fallo con codigo ${response.status}.`);
    }

    const payload = (await readResponse(response)) as GfwReportResponse;
    if (!isReportRunning(payload)) {
      return payload;
    }

    await waitFor(pollIntervalMs);
  }

  throw new Error("Global Fishing Watch no termino el ultimo reporte dentro del tiempo esperado.");
}

export function extractPresenceEntries(payload: GfwReportResponse): GfwReportEntry[] {
  const bucket = payload.entries?.flatMap((entry) => {
    const datasetKey = Object.keys(entry).find((key) => key.startsWith("public-global-presence"));
    if (!datasetKey) {
      return [];
    }

    return entry[datasetKey] ?? [];
  });

  return (bucket ?? []).filter(
    (entry) =>
      Number.isFinite(entry.lat) &&
      Number.isFinite(entry.lon) &&
      Number.isFinite(entry.hours) &&
      entry.hours > 0,
  );
}

function deriveBounds(cellId: string): BoundingBox {
  const boundary = cellToBoundary(cellId, true);
  const longs = boundary.map(([lon]) => lon);
  const lats = boundary.map(([, lat]) => lat);

  return {
    west: Math.min(...longs),
    south: Math.min(...lats),
    east: Math.max(...longs),
    north: Math.max(...lats),
  };
}

export function aggregatePresenceEntriesToSnapshotImport({
  snapshotDate,
  entries,
  sourceName = GFW_PUBLIC_PRESENCE_SOURCE_NAME,
  coverageKind = "mixed",
  qualityBand = "partial",
  coverageNote = DEFAULT_GFW_COVERAGE_NOTE,
  h3Resolution = DEFAULT_GFW_H3_RESOLUTION,
  coverageZones = DEFAULT_PERU_COVERAGE_ZONES,
}: {
  snapshotDate: string;
  entries: GfwReportEntry[];
  sourceName?: string;
  coverageKind?: MaritimeHeatmapSnapshotImport["coverageKind"];
  qualityBand?: MaritimeHeatmapSnapshotImport["qualityBand"];
  coverageNote?: string;
  h3Resolution?: number;
  coverageZones?: CoverageZone[];
}): MaritimeHeatmapSnapshotImport {
  const cells = new Map<
    string,
    {
      presenceCount: number;
      hoursObserved: number;
    }
  >();

  for (const entry of entries) {
    const cellId = latLngToCell(entry.lat, entry.lon, h3Resolution);
    const current = cells.get(cellId) ?? {
      presenceCount: 0,
      hoursObserved: 0,
    };

    current.presenceCount += entry.vesselIDs ?? 1;
    current.hoursObserved += entry.hours;
    cells.set(cellId, current);
  }

  function isWithinBounds(lat: number, lon: number, bounds: BoundingBox): boolean {
    return (
      lon >= bounds.west &&
      lon <= bounds.east &&
      lat >= bounds.south &&
      lat <= bounds.north
    );
  }

  function classifyCoverage(lat: number, lon: number): MaritimeHeatmapSnapshotImport["coverageKind"] | null {
    const matches = coverageZones
      .filter((zone) => isWithinBounds(lat, lon, zone.bounds))
      .map((zone) => zone.kind);

    if (matches.length === 0) {
      return null;
    }

    if (matches.includes("maritime") && matches.includes("fluvial")) {
      return "mixed";
    }

    return matches[0] ?? null;
  }

  return {
    snapshotDate,
    sourceName,
    coverageKind,
    qualityBand,
    coverageNote,
    cells: [...cells.entries()]
      .map(([cellId, value]) => {
        const [lat, lon] = cellToLatLng(cellId);
        const derivedCoverageKind = classifyCoverage(lat, lon);
        return {
          cellId,
          gridSystem: "h3" as const,
          resolution: h3Resolution,
          lat,
          lon,
          geometryBounds: deriveBounds(cellId),
          presenceCount: Math.round(value.presenceCount),
          hoursObserved: Number(value.hoursObserved.toFixed(2)),
          sourceName,
          coverageKind: derivedCoverageKind ?? coverageKind,
          qualityBand,
          include: derivedCoverageKind !== null,
        };
      })
      .filter((cell) => cell.include)
      .map((entry) => {
        const { include, ...cell } = entry;
        void include;
        return cell;
      })
      .sort((left, right) => right.presenceCount - left.presenceCount || left.cellId.localeCompare(right.cellId)),
  };
}

export async function fetchGfwDailyHeatmapSnapshot(
  options: GfwHeatmapSyncOptions,
): Promise<MaritimeHeatmapSnapshotImport> {
  const {
    apiToken,
    snapshotDate,
    geojson = PERU_FLEET_HEATMAP_GEOJSON,
    sourceName = GFW_PUBLIC_PRESENCE_SOURCE_NAME,
    dataset = GFW_PUBLIC_PRESENCE_DATASET,
    coverageKind = "mixed",
    qualityBand = "partial",
    coverageNote = DEFAULT_GFW_COVERAGE_NOTE,
    h3Resolution = DEFAULT_GFW_H3_RESOLUTION,
    sourceUrl = GFW_PUBLIC_PRESENCE_SOURCE_URL,
    baseUrl = DEFAULT_GFW_BASE_URL,
    spatialResolution = DEFAULT_GFW_SPATIAL_RESOLUTION,
    vesselTypes = [],
    fetchImpl,
    timeoutMs = DEFAULT_GFW_TIMEOUT_MS,
    pollIntervalMs = DEFAULT_GFW_LAST_REPORT_POLL_MS,
    pollAttempts = DEFAULT_GFW_LAST_REPORT_ATTEMPTS,
  } = options;

  const fetcher = getFetchImplementation(fetchImpl);
  const requestUrl = buildGfwHeatmapReportUrl({
    baseUrl,
    snapshotDate,
    dataset,
    spatialResolution,
    vesselTypes,
  });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(requestUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ geojson }),
      signal: controller.signal,
    });

    let payload: GfwReportResponse;

    if (response.ok) {
      payload = (await readResponse(response)) as GfwReportResponse;
    } else if (response.status === 429 || response.status === 524) {
      payload = await pollLastReport({
        baseUrl,
        apiToken,
        pollIntervalMs,
        pollAttempts,
        fetchImpl,
      });
    } else {
      const errorPayload = await readResponse(response);
      throw new Error(
        `Global Fishing Watch report fallo con codigo ${response.status}: ${JSON.stringify(errorPayload)}`,
      );
    }

    const entries = extractPresenceEntries(payload);
    return {
      ...aggregatePresenceEntriesToSnapshotImport({
        snapshotDate,
        entries,
        sourceName,
        coverageKind,
        qualityBand,
        coverageNote,
        h3Resolution,
      }),
      sourceName,
      coverageNote: `${coverageNote} Fuente: ${sourceUrl}.`,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
