import type {
  BindVesselBody,
  MaritimeAlertsEnvelope,
  MaritimeBindingEnvelope,
  MaritimeHistoryWindow,
  MaritimeLatestSnapshotEnvelope,
  MaritimeManualRefreshEnvelope,
  MaritimeSummaryEnvelope,
  MaritimeTimelineEnvelope,
  MaritimeVesselLatestEnvelope,
} from "../contracts/maritime.js";
import type { MaritimeApiEnv } from "../config/env.js";
import type { MaritimeCache } from "../plugins/cache.js";
import type { MaritimeRepository } from "../repositories/maritimeRepository.js";

export interface MaritimeReadService {
  ready: () => Promise<void>;
  getShipmentSummary: (shipmentRef: string) => Promise<MaritimeSummaryEnvelope | null>;
  getLatestSnapshot: (shipmentRef: string) => Promise<MaritimeLatestSnapshotEnvelope | null>;
  listSnapshots: (
    shipmentRef: string,
    window: MaritimeHistoryWindow,
  ) => Promise<MaritimeTimelineEnvelope | null>;
  listAlerts: (shipmentRef: string) => Promise<MaritimeAlertsEnvelope | null>;
  getLatestByVesselImo: (imo: string) => Promise<MaritimeVesselLatestEnvelope>;
  bindVessel: (shipmentRef: string, input: BindVesselBody) => Promise<MaritimeBindingEnvelope | null>;
  requestManualRefresh: (
    shipmentRef: string,
    requestedBy: string | undefined,
    note: string | undefined,
  ) => Promise<MaritimeManualRefreshEnvelope | null>;
}

interface CreateMaritimeReadServiceOptions {
  repository: MaritimeRepository;
  cache: MaritimeCache;
  env: MaritimeApiEnv;
}

function shipmentCachePrefix(shipmentRef: string): string {
  return `shipment:${shipmentRef}:`;
}

function shipmentCacheKey(shipmentRef: string, suffix: string): string {
  return `${shipmentCachePrefix(shipmentRef)}${suffix}`;
}

function vesselCacheKey(imo: string): string {
  return `vessel:${imo}:latest`;
}

export function createMaritimeReadService({
  repository,
  cache,
  env,
}: CreateMaritimeReadServiceOptions): MaritimeReadService {
  return {
    ready: async () => {
      await repository.ping();
    },

    getShipmentSummary: async (shipmentRef) => {
      const cacheKey = shipmentCacheKey(shipmentRef, "summary");
      const cached = cache.get<MaritimeSummaryEnvelope>(cacheKey);

      if (cached) {
        return cached;
      }

      const shipment = await repository.findShipmentByRef(shipmentRef);
      if (!shipment) {
        return null;
      }

      const summary = await repository.getShipmentSummary(shipment);
      const envelope: MaritimeSummaryEnvelope = {
        status:
          summary.trackingStatus === "degraded"
            ? "degraded"
            : summary.trackingStatus === "ready"
              ? "ready"
              : "empty",
        summary,
      };

      cache.set(cacheKey, envelope, env.cacheSummaryTtlMs);
      return envelope;
    },

    getLatestSnapshot: async (shipmentRef) => {
      const cacheKey = shipmentCacheKey(shipmentRef, "latest");
      const cached = cache.get<MaritimeLatestSnapshotEnvelope>(cacheKey);

      if (cached) {
        return cached;
      }

      const shipment = await repository.findShipmentByRef(shipmentRef);
      if (!shipment) {
        return null;
      }

      const snapshot = await repository.getLatestSnapshot(shipment);
      const envelope: MaritimeLatestSnapshotEnvelope = snapshot
        ? {
            status: snapshot.signalFreshness === "lost" ? "degraded" : "ready",
            snapshot,
          }
        : {
            status: "empty",
            snapshot: null,
          };

      cache.set(cacheKey, envelope, env.cacheSummaryTtlMs);
      return envelope;
    },

    listSnapshots: async (shipmentRef, window) => {
      const cacheKey = shipmentCacheKey(shipmentRef, `timeline:${window}`);
      const cached = cache.get<MaritimeTimelineEnvelope>(cacheKey);

      if (cached) {
        return cached;
      }

      const shipment = await repository.findShipmentByRef(shipmentRef);
      if (!shipment) {
        return null;
      }

      const snapshots = await repository.listSnapshots(shipment, window);
      const envelope: MaritimeTimelineEnvelope = {
        status: snapshots.length > 0 ? "ready" : "empty",
        window,
        snapshots,
      };

      cache.set(cacheKey, envelope, env.cacheTimelineTtlMs);
      return envelope;
    },

    listAlerts: async (shipmentRef) => {
      const cacheKey = shipmentCacheKey(shipmentRef, "alerts");
      const cached = cache.get<MaritimeAlertsEnvelope>(cacheKey);

      if (cached) {
        return cached;
      }

      const shipment = await repository.findShipmentByRef(shipmentRef);
      if (!shipment) {
        return null;
      }

      const alerts = await repository.listAlerts(shipment);
      const envelope: MaritimeAlertsEnvelope = {
        status: alerts.length > 0 ? "ready" : "empty",
        alerts,
      };

      cache.set(cacheKey, envelope, env.cacheAlertsTtlMs);
      return envelope;
    },

    getLatestByVesselImo: async (imo) => {
      const cacheKey = vesselCacheKey(imo);
      const cached = cache.get<MaritimeVesselLatestEnvelope>(cacheKey);

      if (cached) {
        return cached;
      }

      const envelope = await repository.getLatestByVesselImo(imo);
      cache.set(cacheKey, envelope, env.cacheSummaryTtlMs);
      return envelope;
    },

    bindVessel: async (shipmentRef, input) => {
      const shipment = await repository.findShipmentByRef(shipmentRef);
      if (!shipment) {
        return null;
      }

      const binding = await repository.bindVessel(shipment, input);
      cache.deleteByPrefix(shipmentCachePrefix(shipmentRef));

      if (binding.imo) {
        cache.delete(vesselCacheKey(binding.imo));
      }

      return {
        status: binding.status,
        binding,
      };
    },

    requestManualRefresh: async (shipmentRef, requestedBy, note) => {
      const shipment = await repository.findShipmentByRef(shipmentRef);
      if (!shipment) {
        return null;
      }

      if (!env.enableManualRefresh) {
        return {
          status: "disabled",
          shipmentRef,
        };
      }

      const result = await repository.enqueueManualRefresh(
        shipment,
        requestedBy,
        note,
        env.refreshCooldownMs,
      );

      if (result.kind === "cooldown") {
        return {
          status: "cooldown",
          shipmentRef,
          retryAfterSec: result.retryAfterSec,
          nextEligibleAt: result.nextEligibleAt,
        };
      }

      return {
        status: "queued",
        shipmentRef,
        requestId: result.requestId,
        queuedAt: result.queuedAt,
      };
    },
  };
}
