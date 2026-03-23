import type {
  MaritimeHeatmapCoverageEnvelope,
  MaritimeHeatmapDailyEnvelope,
  MaritimeHeatmapLatestEnvelope,
} from "../contracts/maritimeHeatmap.js";
import type { MaritimeApiEnv } from "../config/env.js";
import type { MaritimeCache } from "../plugins/cache.js";
import type { MaritimeHeatmapRepository } from "../repositories/maritimeHeatmapRepository.js";

export interface MaritimeHeatmapReadService {
  ready: () => Promise<void>;
  getLatestSnapshot: () => Promise<MaritimeHeatmapLatestEnvelope>;
  getDailySnapshot: (date?: string) => Promise<MaritimeHeatmapDailyEnvelope>;
  getCoverage: () => Promise<MaritimeHeatmapCoverageEnvelope>;
}

interface CreateMaritimeHeatmapReadServiceOptions {
  repository: MaritimeHeatmapRepository;
  cache: MaritimeCache;
  env: MaritimeApiEnv;
}

function latestCacheKey(): string {
  return "heatmap:latest";
}

function dailyCacheKey(date: string): string {
  return `heatmap:daily:${date}`;
}

function coverageCacheKey(): string {
  return "heatmap:coverage";
}

export function createMaritimeHeatmapReadService({
  repository,
  cache,
  env,
}: CreateMaritimeHeatmapReadServiceOptions): MaritimeHeatmapReadService {
  return {
    ready: async () => {
      await repository.ping();
    },

    getLatestSnapshot: async () => {
      const cacheKey = latestCacheKey();
      const cached = cache.get<MaritimeHeatmapLatestEnvelope>(cacheKey);
      if (cached) {
        return cached;
      }

      const snapshot = await repository.getLatestSnapshot();
      const envelope: MaritimeHeatmapLatestEnvelope = {
        status: snapshot ? "ready" : "empty",
        snapshot,
      };

      cache.set(cacheKey, envelope, env.cacheHeatmapLatestTtlMs);
      return envelope;
    },

    getDailySnapshot: async (date) => {
      const latest = date ? null : await repository.getLatestSnapshot();
      const targetDate = date ?? latest?.snapshotDate ?? null;
      if (!targetDate) {
        return {
          status: "empty",
          snapshot: null,
          cells: [],
        } satisfies MaritimeHeatmapDailyEnvelope;
      }

      const cacheKey = dailyCacheKey(targetDate);
      const cached = cache.get<MaritimeHeatmapDailyEnvelope>(cacheKey);
      if (cached) {
        return cached;
      }

      const snapshot = date ? await repository.getDailySnapshot(targetDate) : latest;
      if (!snapshot) {
        const emptyEnvelope: MaritimeHeatmapDailyEnvelope = {
          status: "empty",
          snapshot: null,
          cells: [],
        };
        cache.set(cacheKey, emptyEnvelope, env.cacheHeatmapDailyTtlMs);
        return emptyEnvelope;
      }

      const cells = await repository.listCellsForDate(snapshot.snapshotDate);
      const envelope: MaritimeHeatmapDailyEnvelope = {
        status: "ready",
        snapshot,
        cells,
      };

      cache.set(cacheKey, envelope, env.cacheHeatmapDailyTtlMs);
      cache.set(latestCacheKey(), { status: "ready", snapshot }, env.cacheHeatmapLatestTtlMs);
      return envelope;
    },

    getCoverage: async () => {
      const cacheKey = coverageCacheKey();
      const cached = cache.get<MaritimeHeatmapCoverageEnvelope>(cacheKey);
      if (cached) {
        return cached;
      }

      const coverage = await repository.getCoverage();
      const envelope: MaritimeHeatmapCoverageEnvelope = {
        status: coverage ? "ready" : "empty",
        coverage,
      };

      cache.set(cacheKey, envelope, env.cacheHeatmapLatestTtlMs);
      return envelope;
    },
  };
}
