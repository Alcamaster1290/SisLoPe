export type MaritimeFleetHeatmapStatus = "idle" | "loading" | "ready" | "empty" | "error";
export type MaritimeFleetHeatmapCoverageKind = "maritime" | "fluvial" | "mixed";
export type MaritimeFleetHeatmapQualityBand = "high" | "medium" | "partial";
export type MaritimeFleetHeatmapGridSystem = "h3";

export interface MaritimeFleetHeatmapGeometryBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface MaritimeFleetHeatmapCell {
  cellId: string;
  gridSystem: MaritimeFleetHeatmapGridSystem;
  resolution: number;
  lat: number;
  lon: number;
  geometryBounds: MaritimeFleetHeatmapGeometryBounds | null;
  presenceCount: number;
  hoursObserved: number;
  sourceName: string;
  coverageKind: MaritimeFleetHeatmapCoverageKind;
  qualityBand: MaritimeFleetHeatmapQualityBand;
}

export interface MaritimeFleetHeatmapSnapshot {
  snapshotDate: string;
  sourceName: string;
  coverageKind: MaritimeFleetHeatmapCoverageKind;
  qualityBand: MaritimeFleetHeatmapQualityBand;
  coverageNote: string | null;
  cellCount: number;
  updatedAt: string;
}

export interface MaritimeFleetHeatmapCoverage {
  snapshotDate: string;
  sourceName: string;
  coverageKind: MaritimeFleetHeatmapCoverageKind;
  qualityBand: MaritimeFleetHeatmapQualityBand;
  coverageNote: string | null;
}

export interface MaritimeFleetHeatmapLatestEnvelope {
  status: "ready" | "empty";
  snapshot: MaritimeFleetHeatmapSnapshot | null;
}

export interface MaritimeFleetHeatmapDailyEnvelope {
  status: "ready" | "empty";
  snapshot: MaritimeFleetHeatmapSnapshot | null;
  cells: MaritimeFleetHeatmapCell[];
}

export interface MaritimeFleetHeatmapCoverageEnvelope {
  status: "ready" | "empty";
  coverage: MaritimeFleetHeatmapCoverage | null;
}
