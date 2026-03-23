import type {
  MaritimeFleetHeatmapCoverageEnvelope,
  MaritimeFleetHeatmapDailyEnvelope,
  MaritimeFleetHeatmapLatestEnvelope,
} from "@/types/maritimeHeatmap";
import type {
  MaritimeFleetHeatmapReadService,
  MaritimeHeatmapDailyQuery,
  MaritimeHeatmapQuery,
} from "@/lib/maritimeHeatmap/service";

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Heatmap request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export function createHttpMaritimeFleetHeatmapReadService(
  apiBaseUrl: string,
): MaritimeFleetHeatmapReadService {
  const baseUrl = apiBaseUrl.replace(/\/+$/, "");

  return {
    async getLatestSnapshot(query?: MaritimeHeatmapQuery) {
      return fetchJson<MaritimeFleetHeatmapLatestEnvelope>(
        `${baseUrl}/api/maritime/heatmap/latest`,
        query?.signal,
      );
    },

    async getDailySnapshot(query?: MaritimeHeatmapDailyQuery) {
      const search = new URLSearchParams();
      if (query?.date) {
        search.set("date", query.date);
      }
      const suffix = search.size > 0 ? `?${search.toString()}` : "";
      return fetchJson<MaritimeFleetHeatmapDailyEnvelope>(
        `${baseUrl}/api/maritime/heatmap/daily${suffix}`,
        query?.signal,
      );
    },

    async getCoverage(query?: MaritimeHeatmapQuery) {
      return fetchJson<MaritimeFleetHeatmapCoverageEnvelope>(
        `${baseUrl}/api/maritime/heatmap/coverage`,
        query?.signal,
      );
    },
  };
}
