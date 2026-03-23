import cors from "@fastify/cors";
import Fastify from "fastify";
import type { MaritimeApiEnv } from "./config/env.js";
import { loadEnv } from "./config/env.js";
import { createMemoryCache, type MaritimeCache } from "./plugins/cache.js";
import { createDatabase, type MaritimeDatabaseClient } from "./plugins/db.js";
import { createMaritimeHeatmapRepository, type MaritimeHeatmapRepository } from "./repositories/maritimeHeatmapRepository.js";
import { createMaritimeRepository, type MaritimeRepository } from "./repositories/maritimeRepository.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerMaritimeHeatmapRoutes } from "./routes/maritimeHeatmap.js";
import { registerMaritimeRoutes } from "./routes/maritime.js";
import {
  createMaritimeHeatmapReadService,
  type MaritimeHeatmapReadService,
} from "./services/maritimeHeatmapReadService.js";
import {
  createMaritimeReadService,
  type MaritimeReadService,
} from "./services/maritimeReadService.js";

export interface BuildAppOptions {
  env?: MaritimeApiEnv;
  readyCheck?: () => Promise<void>;
  repository?: MaritimeRepository;
  heatmapRepository?: MaritimeHeatmapRepository;
  readService?: MaritimeReadService;
  heatmapReadService?: MaritimeHeatmapReadService;
  cache?: MaritimeCache;
  dbClient?: MaritimeDatabaseClient;
  logger?: boolean;
}

function createEmptyHeatmapReadService(): MaritimeHeatmapReadService {
  return {
    ready: async () => undefined,
    getLatestSnapshot: async () => ({ status: "empty", snapshot: null }),
    getDailySnapshot: async () => ({ status: "empty", snapshot: null, cells: [] }),
    getCoverage: async () => ({ status: "empty", coverage: null }),
  };
}

export async function buildApp(options: BuildAppOptions = {}) {
  const env = options.env ?? loadEnv();
  const app = Fastify({
    logger:
      options.logger === false
        ? false
        : {
            level: env.logLevel,
          },
  });

  await app.register(cors, {
    origin: env.frontendOrigin,
  });

  const ownsDbClient =
    !options.dbClient &&
    !options.repository &&
    !options.heatmapRepository &&
    !options.readService &&
    !options.heatmapReadService;
  const dbClient = options.dbClient ?? (ownsDbClient ? createDatabase(env.databaseUrl) : null);
  const cache = options.cache ?? createMemoryCache();
  const repository = options.repository ?? (dbClient ? createMaritimeRepository({ db: dbClient.db }) : null);
  const heatmapRepository =
    options.heatmapRepository ?? (dbClient ? createMaritimeHeatmapRepository({ db: dbClient.db }) : null);
  const readService =
    options.readService ??
    (repository
      ? createMaritimeReadService({
          repository,
          cache,
          env,
        })
      : null);
  const heatmapReadService =
    options.heatmapReadService ??
    (heatmapRepository
      ? createMaritimeHeatmapReadService({
          repository: heatmapRepository,
          cache,
          env,
        })
      : createEmptyHeatmapReadService());
  const readyCheck =
    options.readyCheck ??
    (async () => {
      await Promise.all([
        readService?.ready?.() ?? Promise.resolve(),
        heatmapReadService.ready(),
      ]);
    });

  if (!readService) {
    throw new Error("No fue posible construir MaritimeReadService");
  }

  await registerHealthRoutes(app, { readyCheck });
  await registerMaritimeRoutes(app, { service: readService, env });
  await registerMaritimeHeatmapRoutes(app, { service: heatmapReadService });

  app.addHook("onClose", async () => {
    cache.clear();

    if (ownsDbClient && dbClient) {
      await dbClient.close();
    }
  });

  return app;
}
