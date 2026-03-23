import { afterEach, describe, expect, it, vi } from "vitest";
import type { MaritimeApiEnv } from "../config/env.js";
import { buildApp } from "../app.js";
import type { MaritimeReadService } from "../services/maritimeReadService.js";
import type { MaritimeHeatmapReadService } from "../services/maritimeHeatmapReadService.js";

const env: MaritimeApiEnv = {
  nodeEnv: "test",
  port: 3001,
  databaseUrl: "postgres://maritime:maritime@localhost:5432/maritime",
  frontendOrigin: "http://localhost:5173",
  maritimeAdminApiKey: "secret",
  cacheSummaryTtlMs: 60_000,
  cacheAlertsTtlMs: 60_000,
  cacheTimelineTtlMs: 300_000,
  cacheHeatmapLatestTtlMs: 3_600_000,
  cacheHeatmapDailyTtlMs: 21_600_000,
  enableWriteEndpoints: true,
  enableManualRefresh: false,
  refreshCooldownMs: 900_000,
  logLevel: "info",
};

function createReadServiceMock(): MaritimeReadService {
  return {
    ready: vi.fn(async () => undefined),
    getShipmentSummary: vi.fn(async () => null),
    getLatestSnapshot: vi.fn(async () => ({ status: "empty", snapshot: null })),
    listSnapshots: vi.fn(async () => ({ status: "empty", window: "7d", snapshots: [] })),
    listAlerts: vi.fn(async () => ({ status: "empty", alerts: [] })),
    getLatestByVesselImo: vi.fn(async () => ({ status: "empty", shipmentRef: null, snapshot: null })),
    bindVessel: vi.fn(async () => null),
    requestManualRefresh: vi.fn(async () => null),
  };
}

function createHeatmapServiceMock(): MaritimeHeatmapReadService {
  return {
    ready: vi.fn(async () => undefined),
    getLatestSnapshot: vi.fn(async () => ({
      status: "ready",
      snapshot: {
        snapshotDate: "2026-03-22",
        sourceName: "public-ais",
        coverageKind: "mixed",
        qualityBand: "partial",
        coverageNote: "Cobertura referencial, parcial en corredores fluviales",
        cellCount: 2,
        updatedAt: "2026-03-22T06:00:00.000Z",
      },
    })),
    getDailySnapshot: vi.fn(async () => ({
      status: "ready",
      snapshot: {
        snapshotDate: "2026-03-22",
        sourceName: "public-ais",
        coverageKind: "mixed",
        qualityBand: "partial",
        coverageNote: "Cobertura referencial, parcial en corredores fluviales",
        cellCount: 2,
        updatedAt: "2026-03-22T06:00:00.000Z",
      },
      cells: [
        {
          cellId: "84754a9ffffffff",
          gridSystem: "h3",
          resolution: 4,
          lat: -12.2,
          lon: -77.3,
          geometryBounds: null,
          presenceCount: 12,
          hoursObserved: 8,
          sourceName: "public-ais",
          coverageKind: "maritime",
          qualityBand: "partial",
        },
      ],
    })),
    getCoverage: vi.fn(async () => ({
      status: "ready",
      coverage: {
        snapshotDate: "2026-03-22",
        sourceName: "public-ais",
        coverageKind: "mixed",
        qualityBand: "partial",
        coverageNote: "Cobertura referencial, parcial en corredores fluviales",
      },
    })),
  };
}

describe("maritime heatmap routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("devuelve el latest snapshot del heatmap", async () => {
    const app = await buildApp({
      env,
      readService: createReadServiceMock(),
      heatmapReadService: createHeatmapServiceMock(),
      logger: false,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/maritime/heatmap/latest",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toContain("max-age=3600");
    expect(response.json().snapshot.snapshotDate).toBe("2026-03-22");
    await app.close();
  });

  it("devuelve el heatmap diario del dia solicitado", async () => {
    const heatmapService = createHeatmapServiceMock();
    const app = await buildApp({
      env,
      readService: createReadServiceMock(),
      heatmapReadService: heatmapService,
      logger: false,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/maritime/heatmap/daily?date=2026-03-22",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().cells).toHaveLength(1);
    expect(heatmapService.getDailySnapshot).toHaveBeenCalledWith("2026-03-22");
    await app.close();
  });
});
