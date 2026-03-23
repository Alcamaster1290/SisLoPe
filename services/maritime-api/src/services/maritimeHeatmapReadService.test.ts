import { describe, expect, it, vi } from "vitest";
import type { MaritimeApiEnv } from "../config/env.js";
import { createMemoryCache } from "../plugins/cache.js";
import { createMaritimeHeatmapReadService } from "./maritimeHeatmapReadService.js";
import type { MaritimeHeatmapRepository } from "../repositories/maritimeHeatmapRepository.js";

const env: MaritimeApiEnv = {
  nodeEnv: "test",
  port: 3001,
  databaseUrl: "postgres://maritime:maritime@localhost:5432/maritime",
  frontendOrigin: "http://localhost:5173",
  maritimeAdminApiKey: "secret",
  cacheSummaryTtlMs: 1_000,
  cacheAlertsTtlMs: 1_000,
  cacheTimelineTtlMs: 1_000,
  cacheHeatmapLatestTtlMs: 5_000,
  cacheHeatmapDailyTtlMs: 10_000,
  enableWriteEndpoints: true,
  enableManualRefresh: false,
  refreshCooldownMs: 900_000,
  logLevel: "info",
};

function createRepositoryMock(): MaritimeHeatmapRepository {
  return {
    ping: vi.fn(async () => undefined),
    getLatestSnapshot: vi.fn(async () => ({
      snapshotDate: "2026-03-22",
      sourceName: "public-ais",
      coverageKind: "mixed",
      qualityBand: "partial",
      coverageNote: "Cobertura referencial, parcial en corredores fluviales",
      cellCount: 2,
      updatedAt: "2026-03-22T06:00:00.000Z",
    })),
    getDailySnapshot: vi.fn(async () => ({
      snapshotDate: "2026-03-22",
      sourceName: "public-ais",
      coverageKind: "mixed",
      qualityBand: "partial",
      coverageNote: "Cobertura referencial, parcial en corredores fluviales",
      cellCount: 2,
      updatedAt: "2026-03-22T06:00:00.000Z",
    })),
    listCellsForDate: vi.fn(async () => [
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
    ]),
    getCoverage: vi.fn(async () => ({
      snapshotDate: "2026-03-22",
      sourceName: "public-ais",
      coverageKind: "mixed",
      qualityBand: "partial",
      coverageNote: "Cobertura referencial, parcial en corredores fluviales",
    })),
    importSnapshot: vi.fn(async (input) => ({
      snapshotDate: input.snapshotDate,
      sourceName: input.sourceName,
      coverageKind: input.coverageKind,
      qualityBand: input.qualityBand,
      coverageNote: input.coverageNote ?? null,
      cellCount: input.cells.length,
      updatedAt: "2026-03-22T06:00:00.000Z",
    })),
  };
}

describe("createMaritimeHeatmapReadService", () => {
  it("cachea latest hasta expirar su TTL", async () => {
    const repository = createRepositoryMock();
    const service = createMaritimeHeatmapReadService({
      repository,
      cache: createMemoryCache(),
      env,
    });

    const first = await service.getLatestSnapshot();
    const second = await service.getLatestSnapshot();

    expect(first.status).toBe("ready");
    expect(second.snapshot?.snapshotDate).toBe("2026-03-22");
    expect(repository.getLatestSnapshot).toHaveBeenCalledTimes(1);
  });

  it("arma el snapshot diario con celdas del mismo dia", async () => {
    const repository = createRepositoryMock();
    const service = createMaritimeHeatmapReadService({
      repository,
      cache: createMemoryCache(),
      env,
    });

    const response = await service.getDailySnapshot("2026-03-22");

    expect(response.status).toBe("ready");
    expect(response.snapshot?.snapshotDate).toBe("2026-03-22");
    expect(response.cells).toHaveLength(1);
    expect(repository.listCellsForDate).toHaveBeenCalledWith("2026-03-22");
  });
});
