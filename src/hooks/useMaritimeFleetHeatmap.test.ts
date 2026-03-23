import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMaritimeFleetHeatmap } from "@/hooks/useMaritimeFleetHeatmap";
import type { MaritimeFleetHeatmapReadService } from "@/lib/maritimeHeatmap/service";
import type {
  MaritimeFleetHeatmapCoverageEnvelope,
  MaritimeFleetHeatmapDailyEnvelope,
  MaritimeFleetHeatmapLatestEnvelope,
} from "@/types/maritimeHeatmap";

function createServiceMock(): MaritimeFleetHeatmapReadService {
  const latest: MaritimeFleetHeatmapLatestEnvelope = {
    status: "ready",
    snapshot: {
      snapshotDate: "2026-03-22",
      sourceName: "public-demo",
      coverageKind: "mixed",
      qualityBand: "partial",
      coverageNote: "Cobertura referencial, parcial en corredores fluviales.",
      cellCount: 1,
      updatedAt: "2026-03-22T00:00:00.000Z",
    },
  };
  const daily: MaritimeFleetHeatmapDailyEnvelope = {
    status: "ready",
    snapshot: latest.snapshot,
    cells: [
      {
        cellId: "85754e67fffffff",
        gridSystem: "h3",
        resolution: 5,
        lat: -12.04,
        lon: -77.03,
        geometryBounds: null,
        presenceCount: 12,
        hoursObserved: 4,
        sourceName: "public-demo",
        coverageKind: "mixed",
        qualityBand: "partial",
      },
    ],
  };
  const coverage: MaritimeFleetHeatmapCoverageEnvelope = {
    status: "ready",
    coverage: {
      snapshotDate: "2026-03-22",
      sourceName: "public-demo",
      coverageKind: "mixed",
      qualityBand: "partial",
      coverageNote: "Cobertura referencial, parcial en corredores fluviales.",
    },
  };

  return {
    getLatestSnapshot: vi.fn(async () => latest),
    getDailySnapshot: vi.fn(async () => daily),
    getCoverage: vi.fn(async () => coverage),
  };
}

describe("useMaritimeFleetHeatmap", () => {
  it("carga el snapshot diario cuando la capa esta habilitada", async () => {
    const service = createServiceMock();

    const { result } = renderHook(() =>
      useMaritimeFleetHeatmap({
        enabled: true,
        service,
      }),
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));

    expect(service.getDailySnapshot).toHaveBeenCalledTimes(1);
    expect(service.getCoverage).toHaveBeenCalledTimes(1);
    expect(result.current.cells).toHaveLength(1);
  });

  it("permanece inactivo cuando el feature esta apagado", () => {
    const service = createServiceMock();

    const { result } = renderHook(() =>
      useMaritimeFleetHeatmap({
        enabled: false,
        service,
      }),
    );

    expect(result.current.status).toBe("idle");
    expect(service.getDailySnapshot).not.toHaveBeenCalled();
    expect(service.getCoverage).not.toHaveBeenCalled();
  });

  it("reporta error si falla la carga", async () => {
    const service: MaritimeFleetHeatmapReadService = {
      getLatestSnapshot: vi.fn(async () => ({
        status: "empty" as const,
        snapshot: null,
      })),
      getDailySnapshot: vi.fn(async () => {
        throw new Error("fallo de red");
      }),
      getCoverage: vi.fn(async () => ({
        status: "empty" as const,
        coverage: null,
      })),
    };

    const { result } = renderHook(() =>
      useMaritimeFleetHeatmap({
        enabled: true,
        service,
      }),
    );

    await waitFor(() => expect(result.current.status).toBe("error"));

    expect(result.current.errorMessage).toMatch(/fallo de red/i);
  });
});
