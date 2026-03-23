import type {
  MaritimeFleetHeatmapCoverageEnvelope,
  MaritimeFleetHeatmapDailyEnvelope,
  MaritimeFleetHeatmapLatestEnvelope,
} from "@/types/maritimeFleetHeatmap";

export interface MaritimeFleetHeatmapQuery {
  date?: string;
  signal?: AbortSignal;
}

export interface MaritimeFleetHeatmapReadService {
  getLatestSnapshot: (signal?: AbortSignal) => Promise<MaritimeFleetHeatmapLatestEnvelope>;
  getDailySnapshot: (query?: MaritimeFleetHeatmapQuery) => Promise<MaritimeFleetHeatmapDailyEnvelope>;
  getCoverage: (signal?: AbortSignal) => Promise<MaritimeFleetHeatmapCoverageEnvelope>;
}

async function readJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new Error(`Solicitud fallida con codigo ${response.status}`);
  }

  return (await response.json()) as T;
}

export function createHttpMaritimeFleetHeatmapReadService(
  baseUrl: string,
): MaritimeFleetHeatmapReadService {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  return {
    getLatestSnapshot: async (signal) =>
      readJson<MaritimeFleetHeatmapLatestEnvelope>(`${normalizedBaseUrl}/api/maritime/heatmap/latest`, {
        signal,
      }),
    getDailySnapshot: async (query = {}) => {
      const url = new URL(`${normalizedBaseUrl}/api/maritime/heatmap/daily`);
      if (query.date) {
        url.searchParams.set("date", query.date);
      }

      return readJson<MaritimeFleetHeatmapDailyEnvelope>(url, {
        signal: query.signal,
      });
    },
    getCoverage: async (signal) =>
      readJson<MaritimeFleetHeatmapCoverageEnvelope>(`${normalizedBaseUrl}/api/maritime/heatmap/coverage`, {
        signal,
      }),
  };
}

export function createNoopMaritimeFleetHeatmapReadService(): MaritimeFleetHeatmapReadService {
  return {
    getLatestSnapshot: async () => ({
      status: "empty",
      snapshot: null,
    }),
    getDailySnapshot: async () => ({
      status: "empty",
      snapshot: null,
      cells: [],
    }),
    getCoverage: async () => ({
      status: "empty",
      coverage: null,
    }),
  };
}
