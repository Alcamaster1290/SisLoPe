import { LRUCache } from "lru-cache";

import type { MaritimeApiEnv } from "../config/env.js";

interface CacheEntry<T> {
  value: T;
}

export interface MaritimeCacheTtls {
  summaryMs: number;
  latestSnapshotMs: number;
  alertsMs: number;
  timelineMs: number;
  vesselLatestMs: number;
}

export interface MaritimeCache {
  readonly ttls: MaritimeCacheTtls;
  get: <T>(key: string) => T | undefined;
  set: <T>(key: string, value: T, ttlMs: number) => void;
  delete: (key: string) => void;
  deleteByPrefix: (prefix: string) => void;
  invalidateShipment: (shipmentRef: string) => void;
  invalidateVessel: (imo: string) => void;
  clear: () => void;
  keys: () => string[];
}

export interface MaritimeCacheOptions {
  maxEntries?: number;
  ttls?: MaritimeCacheTtls;
}

export function createMemoryCache(options: MaritimeCacheOptions = {}): MaritimeCache {
  const store = new LRUCache<string, CacheEntry<unknown>>({
    max: options.maxEntries ?? 500,
    ttlAutopurge: true,
  });

  const ttls =
    options.ttls ??
    ({
      summaryMs: 60_000,
      latestSnapshotMs: 60_000,
      alertsMs: 60_000,
      timelineMs: 300_000,
      vesselLatestMs: 60_000,
    } satisfies MaritimeCacheTtls);

  return {
    ttls,
    get: <T>(key: string) => store.get(key)?.value as T | undefined,
    set: <T>(key: string, value: T, ttlMs: number) => {
      store.set(key, { value }, { ttl: ttlMs });
    },
    delete: (key: string) => {
      store.delete(key);
    },
    deleteByPrefix: (prefix: string) => {
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
          store.delete(key);
        }
      }
    },
    invalidateShipment: (shipmentRef: string) => {
      for (const key of store.keys()) {
        if (key.startsWith(`shipment:${shipmentRef}:`)) {
          store.delete(key);
        }
      }
    },
    invalidateVessel: (imo: string) => {
      for (const key of store.keys()) {
        if (key.startsWith(`vessel:${imo}:`)) {
          store.delete(key);
        }
      }
    },
    clear: () => {
      store.clear();
    },
    keys: () => [...store.keys()],
  };
}

export function createMaritimeCache(env: MaritimeApiEnv): MaritimeCache {
  return createMemoryCache({
    ttls: {
      summaryMs: env.cacheSummaryTtlMs,
      latestSnapshotMs: env.cacheSummaryTtlMs,
      alertsMs: env.cacheAlertsTtlMs,
      timelineMs: env.cacheTimelineTtlMs,
      vesselLatestMs: env.cacheSummaryTtlMs,
    },
  });
}
