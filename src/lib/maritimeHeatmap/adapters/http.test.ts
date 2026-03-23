import { describe, expect, it, vi } from "vitest";
import { createHttpMaritimeFleetHeatmapReadService } from "@/lib/maritimeHeatmap/adapters/http";

describe("createHttpMaritimeFleetHeatmapReadService", () => {
  it("normaliza envelopes de latest, daily y coverage", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/maritime/heatmap/latest")) {
        return {
          ok: true,
          async json() {
            return {
              status: "ready",
              snapshot: {
                snapshotDate: "2026-03-22",
                sourceName: "public-demo",
                coverageKind: "mixed",
                qualityBand: "partial",
                cellCount: 1,
                updatedAt: "2026-03-22T00:00:00.000Z",
                coverageNote: null,
              },
            };
          },
        };
      }

      if (url.includes("/api/maritime/heatmap/daily")) {
        return {
          ok: true,
          async json() {
            return {
              status: "ready",
              snapshot: {
                snapshotDate: "2026-03-22",
                sourceName: "public-demo",
                coverageKind: "mixed",
                qualityBand: "partial",
                cellCount: 1,
                updatedAt: "2026-03-22T00:00:00.000Z",
                coverageNote: null,
              },
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
          },
        };
      }

      return {
        ok: true,
        async json() {
            return {
              status: "ready",
              coverage: {
                snapshotDate: "2026-03-22",
                sourceName: "public-demo",
                coverageKind: "mixed",
                qualityBand: "partial",
                coverageNote: "Cobertura referencial, parcial en corredores fluviales.",
              },
            };
        },
      };
    });

    vi.stubGlobal("fetch", fetchMock);

    const service = createHttpMaritimeFleetHeatmapReadService("https://tracking.example.com/");
    const latest = await service.getLatestSnapshot();
    const daily = await service.getDailySnapshot({ date: "2026-03-22" });
    const coverage = await service.getCoverage();

    expect(latest.snapshot?.snapshotDate).toBe("2026-03-22");
    expect(daily.cells).toHaveLength(1);
    expect(coverage.coverage?.coverageNote).toMatch(/parcial/i);

    vi.unstubAllGlobals();
  });
});
