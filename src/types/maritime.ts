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

export interface MaritimeCoordinate {
  lat: number;
  lon: number;
}

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
