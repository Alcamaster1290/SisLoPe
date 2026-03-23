import { afterEach, describe, expect, it, vi } from "vitest";
import type { MaritimeApiEnv } from "../config/env.js";
import { buildApp } from "../app.js";
import type { MaritimeReadService } from "../services/maritimeReadService.js";

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

function createServiceMock(): MaritimeReadService {
  return {
    ready: vi.fn(async () => undefined),
    getShipmentSummary: vi.fn(async () => ({
      status: "ready",
      summary: {
        shipmentRef: "SHP-001",
        direction: "import",
        shipmentStatus: "in_transit",
        trackingStatus: "ready",
        bindingStatus: "bound",
        vesselName: "Andes Carrier",
        imo: "9387421",
        mmsi: "123456789",
        destination: "Callao",
        eta: "2026-03-30T10:00:00.000Z",
        statusSummary: "En ruta",
        lastObservedAt: "2026-03-22T10:00:00.000Z",
        lastSyncedAt: "2026-03-22T10:05:00.000Z",
        latestPosition: { lat: -12.04, lon: -77.03 },
        alertCount: 1,
      },
    })),
    getLatestSnapshot: vi.fn(async () => ({
      status: "ready",
      snapshot: null,
    })),
    listSnapshots: vi.fn(async () => ({
      status: "empty",
      window: "7d",
      snapshots: [],
    })),
    listAlerts: vi.fn(async () => ({
      status: "empty",
      alerts: [],
    })),
    getLatestByVesselImo: vi.fn(async () => ({
      status: "empty",
      shipmentRef: null,
      snapshot: null,
    })),
    bindVessel: vi.fn(async () => ({
      status: "bound",
      binding: {
        shipmentRef: "SHP-001",
        status: "bound",
        vesselName: "Pacific Trader",
        imo: "9999999",
        mmsi: "888888888",
        source: "ops",
        confidence: 0.95,
        updatedAt: "2026-03-22T10:10:00.000Z",
      },
    })),
    requestManualRefresh: vi.fn(async () => ({
      status: "disabled",
      shipmentRef: "SHP-001",
    })),
  };
}

describe("maritime routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("devuelve 404 cuando summary no existe", async () => {
    const service = createServiceMock();
    service.getShipmentSummary = vi.fn(async () => null);
    const app = await buildApp({ env, readService: service, logger: false });

    const response = await app.inject({
      method: "GET",
      url: "/api/maritime/shipments/UNKNOWN/summary",
    });

    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it("expone cache headers en summary", async () => {
    const app = await buildApp({ env, readService: createServiceMock(), logger: false });

    const response = await app.inject({
      method: "GET",
      url: "/api/maritime/shipments/SHP-001/summary",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toContain("max-age=60");
    await app.close();
  });

  it("protege bind-vessel con admin key", async () => {
    const app = await buildApp({ env, readService: createServiceMock(), logger: false });

    const response = await app.inject({
      method: "POST",
      url: "/api/maritime/shipments/SHP-001/bind-vessel",
      payload: {
        imo: "9999999",
        mmsi: "888888888",
        source: "ops",
      },
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });
});
