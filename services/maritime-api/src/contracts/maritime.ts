import { z } from "zod";

export type MaritimeShipmentDirection = "import" | "export";
export type MaritimeShipmentState =
  | "planned"
  | "unbound"
  | "in_transit"
  | "arriving"
  | "arrived"
  | "delayed";
export type MaritimeTrackingStatus = "idle" | "loading" | "ready" | "empty" | "degraded" | "error";
export type MaritimeBindingStatus = "unbound" | "bound" | "ambiguous";
export type MaritimeAlertSeverity = "info" | "warning" | "critical";
export type MaritimeAlertState = "open" | "resolved";
export type MaritimeSignalFreshness = "fresh" | "stale" | "lost";
export type MaritimeHistoryWindow = "24h" | "72h" | "7d" | "30d";
export type MaritimeReadStatus = "ready" | "empty" | "degraded";
export type MaritimeHeatmapGridSystem = "h3";
export type MaritimeHeatmapCoverageKind = "maritime" | "fluvial" | "mixed";
export type MaritimeHeatmapQualityBand = "high" | "medium" | "partial";
export type MaritimeHeatmapRunState = "running" | "succeeded" | "failed";

export interface MaritimeCoordinate {
  lat: number;
  lon: number;
}

export interface MaritimeBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export type MaritimeHeatmapGeometryBounds = MaritimeBounds;

export interface MaritimeShipmentBinding {
  shipmentRef: string;
  status: MaritimeBindingStatus;
  vesselName: string | null;
  imo: string | null;
  mmsi: string | null;
  source: string | null;
  confidence: number | null;
  updatedAt: string | null;
}

export interface MaritimeTrackingSnapshot {
  shipmentRef: string;
  vesselName: string | null;
  observedAt: string;
  position: MaritimeCoordinate;
  destination: string | null;
  destinationPortCode: string | null;
  destinationPortName: string | null;
  eta: string | null;
  navStatus: string | null;
  sog: number | null;
  cog: number | null;
  signalFreshness: MaritimeSignalFreshness;
  statusSummary: string;
  providerSource: string;
}

export interface MaritimeAlert {
  id: string;
  shipmentRef: string;
  type: string;
  severity: MaritimeAlertSeverity;
  state: MaritimeAlertState;
  title: string;
  message: string;
  detectedAt: string;
  resolvedAt: string | null;
}

export interface MaritimeShipmentSummary {
  shipmentRef: string;
  direction: MaritimeShipmentDirection | null;
  shipmentStatus: MaritimeShipmentState;
  trackingStatus: MaritimeTrackingStatus;
  bindingStatus: MaritimeBindingStatus;
  vesselName: string | null;
  imo: string | null;
  mmsi: string | null;
  destination: string | null;
  eta: string | null;
  statusSummary: string;
  lastObservedAt: string | null;
  lastSyncedAt: string | null;
  latestPosition: MaritimeCoordinate | null;
  alertCount: number;
}

export interface MaritimeHeatmapSnapshot {
  snapshotDate: string;
  sourceName: string;
  sourceUrl: string | null;
  gridSystem: MaritimeHeatmapGridSystem;
  resolution: number;
  coverageKind: MaritimeHeatmapCoverageKind;
  qualityBand: MaritimeHeatmapQualityBand;
  cellCount: number;
  updatedAt: string;
  note: string | null;
}

export interface MaritimeHeatmapCell {
  snapshotDate: string;
  cellId: string;
  gridSystem: MaritimeHeatmapGridSystem;
  resolution: number;
  center: MaritimeCoordinate;
  geometryBounds: MaritimeBounds | null;
  presenceCount: number;
  hoursObserved: number;
  sourceName: string;
  coverageKind: MaritimeHeatmapCoverageKind;
  qualityBand: MaritimeHeatmapQualityBand;
}

export interface MaritimeHeatmapCoverage {
  snapshotDate: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  coverageKind: MaritimeHeatmapCoverageKind | null;
  qualityBand: MaritimeHeatmapQualityBand | null;
  note: string | null;
  disclaimer: string;
  lastSuccessfulRunAt: string | null;
}

export interface MaritimeSummaryEnvelope {
  status: MaritimeReadStatus;
  summary: MaritimeShipmentSummary;
}

export interface MaritimeLatestSnapshotEnvelope {
  status: MaritimeReadStatus;
  snapshot: MaritimeTrackingSnapshot | null;
}

export interface MaritimeAlertsEnvelope {
  status: "ready" | "empty";
  alerts: MaritimeAlert[];
}

export interface MaritimeTimelineEnvelope {
  status: "ready" | "empty";
  window: MaritimeHistoryWindow;
  snapshots: MaritimeTrackingSnapshot[];
}

export interface MaritimeBindingEnvelope {
  status: MaritimeBindingStatus;
  binding: MaritimeShipmentBinding;
}

export interface MaritimeVesselLatestEnvelope {
  status: MaritimeReadStatus;
  shipmentRef: string | null;
  snapshot: MaritimeTrackingSnapshot | null;
}

export interface MaritimeHeatmapLatestEnvelope {
  status: "ready" | "empty";
  snapshot: MaritimeHeatmapSnapshot | null;
}

export interface MaritimeHeatmapDailyEnvelope {
  status: "ready" | "empty";
  snapshot: MaritimeHeatmapSnapshot | null;
  cells: MaritimeHeatmapCell[];
}

export interface MaritimeHeatmapCoverageEnvelope {
  status: "ready" | "empty";
  coverage: MaritimeHeatmapCoverage;
}

export interface MaritimeManualRefreshQueuedEnvelope {
  status: "queued";
  shipmentRef: string;
  requestId: number;
  queuedAt: string;
}

export interface MaritimeManualRefreshCooldownEnvelope {
  status: "cooldown";
  shipmentRef: string;
  retryAfterSec: number;
  nextEligibleAt: string;
}

export interface MaritimeManualRefreshDisabledEnvelope {
  status: "disabled";
  shipmentRef: string;
}

export type MaritimeManualRefreshEnvelope =
  | MaritimeManualRefreshQueuedEnvelope
  | MaritimeManualRefreshCooldownEnvelope
  | MaritimeManualRefreshDisabledEnvelope;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const shipmentRefParamsSchema = z.object({
  shipmentRef: z.string().trim().min(1).max(80),
});

export const vesselIimoParamsSchema = z.object({
  imo: z.string().trim().min(1).max(32),
});

export const timelineQuerySchema = z.object({
  window: z.enum(["24h", "72h", "7d", "30d"]).default("7d"),
});

export const heatmapDailyQuerySchema = z.object({
  date: z.string().trim().regex(datePattern, "date debe tener formato YYYY-MM-DD").optional(),
});

export const bindVesselBodySchema = z
  .object({
    imo: z.string().trim().min(1).max(32).nullable().optional(),
    mmsi: z.string().trim().min(1).max(32).nullable().optional(),
    vesselName: z.string().trim().min(1).max(160).optional(),
    source: z.string().trim().min(1).max(80),
    confidence: z.number().min(0).max(1).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.imo && !value.mmsi) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "imo o mmsi es obligatorio",
        path: ["imo"],
      });
    }
  });

export const manualRefreshBodySchema = z.object({
  requestedBy: z.string().trim().min(1).max(120).optional(),
  note: z.string().trim().max(280).optional(),
});

export type BindVesselBody = z.infer<typeof bindVesselBodySchema>;
export type ManualRefreshBody = z.infer<typeof manualRefreshBodySchema>;
export type ShipmentRefParams = z.infer<typeof shipmentRefParamsSchema>;
export type VesselImoParams = z.infer<typeof vesselIimoParamsSchema>;
export type TimelineQuery = z.infer<typeof timelineQuerySchema>;
export type HeatmapDailyQuery = z.infer<typeof heatmapDailyQuerySchema>;

export const HISTORY_WINDOW_MS: Record<MaritimeHistoryWindow, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "72h": 72 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};
