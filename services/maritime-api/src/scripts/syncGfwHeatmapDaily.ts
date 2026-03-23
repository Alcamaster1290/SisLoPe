import { loadEnv } from "../config/env.js";
import { createDatabaseConnection } from "../plugins/db.js";
import { createMaritimeHeatmapRepository } from "../repositories/maritimeHeatmapRepository.js";
import {
  computeLatestAvailableSnapshotDate,
  DEFAULT_GFW_COVERAGE_NOTE,
  DEFAULT_GFW_H3_RESOLUTION,
  DEFAULT_GFW_LAG_DAYS,
  DEFAULT_GFW_SPATIAL_RESOLUTION,
  fetchGfwDailyHeatmapSnapshot,
  GFW_PUBLIC_PRESENCE_SOURCE_NAME,
  GFW_PUBLIC_PRESENCE_SOURCE_URL,
  type GfwHeatmapGeoJson,
  type GfwSpatialResolution,
} from "../providers/gfwHeatmap.js";

interface GfwWorkerEnv {
  apiToken: string;
  baseUrl: string | undefined;
  targetDate: string | undefined;
  lagDays: number;
  h3Resolution: number;
  spatialResolution: GfwSpatialResolution;
  vesselTypes: string[];
  sourceName: string;
  sourceUrl: string;
  coverageNote: string;
  geojson: GfwHeatmapGeoJson | undefined;
}

interface CliOptions {
  targetDate?: string;
  dryRun: boolean;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Valor entero invalido: ${value}`);
  }

  return parsed;
}

function parseSpatialResolution(value: string | undefined): GfwSpatialResolution {
  if (!value) {
    return DEFAULT_GFW_SPATIAL_RESOLUTION;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === "LOW" || normalized === "HIGH") {
    return normalized;
  }

  throw new Error(`GFW_HEATMAP_SPATIAL_RESOLUTION invalido: ${value}`);
}

function parseOptionalCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseOptionalGeoJson(value: string | undefined): GfwHeatmapGeoJson | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = JSON.parse(value) as GfwHeatmapGeoJson;
  if (parsed.type !== "Polygon" && parsed.type !== "MultiPolygon") {
    throw new Error("GFW_HEATMAP_REGION_GEOJSON debe ser Polygon o MultiPolygon.");
  }

  return parsed;
}

function parseCli(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const options: CliOptions = {
    dryRun: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) {
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--date") {
      const next = args[index + 1];
      if (!next) {
        throw new Error("Debes indicar una fecha despues de --date.");
      }
      options.targetDate = next;
      index += 1;
      continue;
    }

    if (arg.startsWith("--date=")) {
      options.targetDate = arg.slice("--date=".length);
      continue;
    }
  }

  return options;
}

function loadWorkerEnv(source: NodeJS.ProcessEnv = process.env): GfwWorkerEnv {
  const apiToken = source.GFW_API_TOKEN?.trim();
  if (!apiToken) {
    throw new Error("GFW_API_TOKEN es obligatorio para sincronizar el heatmap diario.");
  }

  return {
    apiToken,
    baseUrl: source.GFW_BASE_URL?.trim() || undefined,
    targetDate: source.GFW_HEATMAP_TARGET_DATE?.trim() || undefined,
    lagDays: parsePositiveInteger(source.GFW_HEATMAP_LAG_DAYS, DEFAULT_GFW_LAG_DAYS),
    h3Resolution: parsePositiveInteger(source.GFW_HEATMAP_H3_RESOLUTION, DEFAULT_GFW_H3_RESOLUTION),
    spatialResolution: parseSpatialResolution(source.GFW_HEATMAP_SPATIAL_RESOLUTION),
    vesselTypes: parseOptionalCsv(source.GFW_HEATMAP_VESSEL_TYPES),
    sourceName: source.GFW_HEATMAP_SOURCE_NAME?.trim() || GFW_PUBLIC_PRESENCE_SOURCE_NAME,
    sourceUrl: source.GFW_HEATMAP_SOURCE_URL?.trim() || GFW_PUBLIC_PRESENCE_SOURCE_URL,
    coverageNote: source.GFW_HEATMAP_COVERAGE_NOTE?.trim() || DEFAULT_GFW_COVERAGE_NOTE,
    geojson: parseOptionalGeoJson(source.GFW_HEATMAP_REGION_GEOJSON),
  };
}

function printDryRunSummary(snapshotDate: string, snapshotImport: Awaited<ReturnType<typeof fetchGfwDailyHeatmapSnapshot>>): void {
  console.info(
    JSON.stringify(
      {
        snapshotDate,
        sourceName: snapshotImport.sourceName,
        cells: snapshotImport.cells.length,
        topCells: snapshotImport.cells.slice(0, 5).map((cell) => ({
          cellId: cell.cellId,
          presenceCount: cell.presenceCount,
          hoursObserved: cell.hoursObserved,
          lat: Number(cell.lat.toFixed(4)),
          lon: Number(cell.lon.toFixed(4)),
          coverageKind: cell.coverageKind,
        })),
      },
      null,
      2,
    ),
  );
}

async function main(): Promise<void> {
  const cli = parseCli(process.argv);
  const workerEnv = loadWorkerEnv();
  const snapshotDate =
    cli.targetDate ??
    workerEnv.targetDate ??
    computeLatestAvailableSnapshotDate(new Date(), workerEnv.lagDays);
  const snapshotImport = await fetchGfwDailyHeatmapSnapshot({
    apiToken: workerEnv.apiToken,
    baseUrl: workerEnv.baseUrl,
    snapshotDate,
    sourceName: workerEnv.sourceName,
    sourceUrl: workerEnv.sourceUrl,
    coverageNote: workerEnv.coverageNote,
    h3Resolution: workerEnv.h3Resolution,
    spatialResolution: workerEnv.spatialResolution,
    vesselTypes: workerEnv.vesselTypes,
    geojson: workerEnv.geojson,
  });

  if (cli.dryRun) {
    printDryRunSummary(snapshotDate, snapshotImport);
    return;
  }

  const appEnv = loadEnv();
  const connection = createDatabaseConnection(appEnv);

  try {
    const repository = createMaritimeHeatmapRepository({ db: connection.db });
    const savedSnapshot = await repository.importSnapshot(snapshotImport);

    console.info(
      `[maritime-api] Heatmap GFW sincronizado ${savedSnapshot.snapshotDate} con ${savedSnapshot.cellCount} celdas H3.`,
    );
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error("[maritime-api] Fallo la sincronizacion diaria del heatmap GFW.", error);
  process.exitCode = 1;
});
