import type {
  MaritimeFleetHeatmapCoverageEnvelope,
  MaritimeFleetHeatmapDailyEnvelope,
  MaritimeFleetHeatmapLatestEnvelope,
} from "@/types/maritimeHeatmap";

export interface MaritimeHeatmapQuery {
  signal?: AbortSignal;
}

export interface MaritimeHeatmapDailyQuery extends MaritimeHeatmapQuery {
  date?: string;
}

export interface MaritimeFleetHeatmapReadService {
  getLatestSnapshot(query?: MaritimeHeatmapQuery): Promise<MaritimeFleetHeatmapLatestEnvelope>;
  getDailySnapshot(query?: MaritimeHeatmapDailyQuery): Promise<MaritimeFleetHeatmapDailyEnvelope>;
  getCoverage(query?: MaritimeHeatmapQuery): Promise<MaritimeFleetHeatmapCoverageEnvelope>;
}
