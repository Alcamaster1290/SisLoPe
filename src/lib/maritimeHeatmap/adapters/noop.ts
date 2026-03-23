import type { MaritimeFleetHeatmapReadService } from "@/lib/maritimeHeatmap/service";

export function createNoopMaritimeFleetHeatmapReadService(): MaritimeFleetHeatmapReadService {
  return {
    async getLatestSnapshot() {
      return {
        status: "empty",
        snapshot: null,
      };
    },
    async getDailySnapshot() {
      return {
        status: "empty",
        snapshot: null,
        cells: [],
      };
    },
    async getCoverage() {
      return {
        status: "empty",
        coverage: null,
      };
    },
  };
}

export const noopMaritimeFleetHeatmapReadService = createNoopMaritimeFleetHeatmapReadService();
