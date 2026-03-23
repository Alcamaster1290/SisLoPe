import { describe, expect, it, vi } from "vitest";
import type { MaritimeApiEnv } from "../config/env.js";
import { createMemoryCache } from "../plugins/cache.js";
import { createMaritimeReadService } from "./maritimeReadService.js";
import type { MaritimeRepository, ShipmentRecord } from "../repositories/maritimeRepository.js";

const env: MaritimeApiEnv = {
  nodeEnv: "test",
  port: 3001,
  databaseUrl: "postgres://maritime:maritime@localhost:5432/maritime",
  frontendOrigin: "http://localhost:5173",
  maritimeAdminApiKey: "secret",
  cacheSummaryTtlMs: 1_000,
  cacheAlertsTtlMs: 1_000,
  cacheTimelineTtlMs: 1_000,
  cacheHeatmapLatestTtlMs: 10_000,
  cacheHeatmapDailyTtlMs: 20_000,
  enableWriteEndpoints: true,
  enableManualRefresh: false,
  refreshCooldownMs: 900_000,
  logLevel: "info",
};

function shipmentRecord(): ShipmentRecord {
  return {
    id: 1,
    shipmentRef: "SHP-001",
    direction: "import",
    shipmentState: "in_transit",
    destinationName: "Callao",
  };
}

function createRepositoryMock(): MaritimeRepository {
  return {
    ping: vi.fn(async () => undefined),
    findShipmentByRef: vi.fn(async () => shipmentRecord()),
    getShipmentSummary: vi.fn(async () => ({
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
    })),
    getBinding: vi.fn(async () => ({
      shipmentRef: "SHP-001",
      status: "bound",
      vesselName: "Andes Carrier",
      imo: "9387421",
      mmsi: "123456789",
      source: "ops",
      confidence: 0.9,
      updatedAt: "2026-03-22T10:00:00.000Z",
    })),
    getLatestSnapshot: vi.fn(async () => ({
      shipmentRef: "SHP-001",
      vesselName: "Andes Carrier",
      observedAt: "2026-03-22T10:00:00.000Z",
      position: { lat: -12.04, lon: -77.03 },
      destination: "Callao",
      destinationPortCode: "PECLL",
      destinationPortName: "Callao",
      eta: "2026-03-30T10:00:00.000Z",
      navStatus: "Under way",
      sog: 13.1,
      cog: 90,
      signalFreshness: "fresh",
      statusSummary: "En ruta",
      providerSource: "mock",
    })),
    listSnapshots: vi.fn(async () => []),
    listAlerts: vi.fn(async () => []),
    getLatestByVesselImo: vi.fn(async () => ({
      status: "ready",
      shipmentRef: "SHP-001",
      snapshot: {
        shipmentRef: "SHP-001",
        vesselName: "Andes Carrier",
        observedAt: "2026-03-22T10:00:00.000Z",
        position: { lat: -12.04, lon: -77.03 },
        destination: "Callao",
        destinationPortCode: "PECLL",
        destinationPortName: "Callao",
        eta: "2026-03-30T10:00:00.000Z",
        navStatus: "Under way",
        sog: 13.1,
        cog: 90,
        signalFreshness: "fresh",
        statusSummary: "En ruta",
        providerSource: "mock",
      },
    })),
    bindVessel: vi.fn(async () => ({
      shipmentRef: "SHP-001",
      status: "bound",
      vesselName: "Pacific Trader",
      imo: "9999999",
      mmsi: "888888888",
      source: "ops",
      confidence: 0.95,
      updatedAt: "2026-03-22T10:10:00.000Z",
    })),
    enqueueManualRefresh: vi.fn(async () => ({
      kind: "queued" as const,
      requestId: 7,
      queuedAt: "2026-03-22T10:11:00.000Z",
    })),
  };
}

describe("createMaritimeReadService", () => {
  it("cachea el summary por shipmentRef", async () => {
    const repository = createRepositoryMock();
    const service = createMaritimeReadService({
      repository,
      cache: createMemoryCache(),
      env,
    });

    const first = await service.getShipmentSummary("SHP-001");
    const second = await service.getShipmentSummary("SHP-001");

    expect(first?.summary.shipmentRef).toBe("SHP-001");
    expect(second?.summary.shipmentRef).toBe("SHP-001");
    expect(repository.getShipmentSummary).toHaveBeenCalledTimes(1);
  });

  it("invalida cache del shipment al reasignar buque", async () => {
    const repository = createRepositoryMock();
    const service = createMaritimeReadService({
      repository,
      cache: createMemoryCache(),
      env,
    });

    await service.getShipmentSummary("SHP-001");
    await service.bindVessel("SHP-001", {
      imo: "9999999",
      mmsi: "888888888",
      vesselName: "Pacific Trader",
      source: "ops",
    });
    await service.getShipmentSummary("SHP-001");

    expect(repository.getShipmentSummary).toHaveBeenCalledTimes(2);
  });

  it("devuelve disabled si manual refresh esta apagado", async () => {
    const repository = createRepositoryMock();
    const service = createMaritimeReadService({
      repository,
      cache: createMemoryCache(),
      env: {
        ...env,
        enableManualRefresh: false,
      },
    });

    const result = await service.requestManualRefresh("SHP-001", "ops", "manual");
    expect(result).toEqual({
      status: "disabled",
      shipmentRef: "SHP-001",
    });
    expect(repository.enqueueManualRefresh).not.toHaveBeenCalled();
  });
});
