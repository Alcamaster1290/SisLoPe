import type {
  MaritimeAlert,
  MaritimeHistoryWindow,
  MaritimeShipmentBinding,
  MaritimeShipmentSummary,
  MaritimeTrackingSnapshot,
} from "@/types/maritime";

export interface MaritimeShipmentQuery {
  shipmentRef: string;
  signal?: AbortSignal;
}

export interface MaritimeTimelineQuery extends MaritimeShipmentQuery {
  window?: MaritimeHistoryWindow;
}

export interface MaritimeTrackingReadService {
  getShipmentSummary(query: MaritimeShipmentQuery): Promise<MaritimeShipmentSummary | null>;
  getLatestSnapshot(query: MaritimeShipmentQuery): Promise<MaritimeTrackingSnapshot | null>;
  listSnapshots(query: MaritimeTimelineQuery): Promise<MaritimeTrackingSnapshot[]>;
  listAlerts(query: MaritimeShipmentQuery): Promise<MaritimeAlert[]>;
  getBinding(query: MaritimeShipmentQuery): Promise<MaritimeShipmentBinding | null>;
}
