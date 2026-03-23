import { describe, expect, it } from "vitest";
import { loadEnv } from "./env.js";

describe("loadEnv", () => {
  it("normaliza variables y convierte TTLs a milisegundos", () => {
    const env = loadEnv({
      NODE_ENV: "test",
      PORT: "3010",
      DATABASE_URL: "postgres://maritime:maritime@localhost:5432/maritime",
      FRONTEND_ORIGIN: "http://localhost:5173",
      MARITIME_ADMIN_API_KEY: "secret",
      MARITIME_CACHE_SUMMARY_TTL_SEC: "10",
      MARITIME_CACHE_ALERTS_TTL_SEC: "20",
      MARITIME_CACHE_TIMELINE_TTL_SEC: "30",
      MARITIME_CACHE_HEATMAP_LATEST_TTL_SEC: "120",
      MARITIME_CACHE_HEATMAP_DAILY_TTL_SEC: "3600",
      MARITIME_ENABLE_WRITE_ENDPOINTS: "true",
      MARITIME_ENABLE_MANUAL_REFRESH: "false",
      MARITIME_REFRESH_COOLDOWN_SEC: "900",
      LOG_LEVEL: "debug",
    });

    expect(env.port).toBe(3010);
    expect(env.cacheSummaryTtlMs).toBe(10_000);
    expect(env.cacheAlertsTtlMs).toBe(20_000);
    expect(env.cacheTimelineTtlMs).toBe(30_000);
    expect(env.cacheHeatmapLatestTtlMs).toBe(120_000);
    expect(env.cacheHeatmapDailyTtlMs).toBe(3_600_000);
    expect(env.refreshCooldownMs).toBe(900_000);
    expect(env.maritimeAdminApiKey).toBe("secret");
    expect(env.enableWriteEndpoints).toBe(true);
    expect(env.enableManualRefresh).toBe(false);
  });

  it("falla si las escrituras estan habilitadas sin admin key", () => {
    expect(() =>
      loadEnv({
        NODE_ENV: "test",
        PORT: "3001",
        DATABASE_URL: "postgres://maritime:maritime@localhost:5432/maritime",
        FRONTEND_ORIGIN: "http://localhost:5173",
        MARITIME_ENABLE_WRITE_ENDPOINTS: "true",
        MARITIME_ENABLE_MANUAL_REFRESH: "false",
        MARITIME_CACHE_SUMMARY_TTL_SEC: "60",
        MARITIME_CACHE_ALERTS_TTL_SEC: "60",
        MARITIME_CACHE_TIMELINE_TTL_SEC: "300",
        MARITIME_CACHE_HEATMAP_LATEST_TTL_SEC: "3600",
        MARITIME_CACHE_HEATMAP_DAILY_TTL_SEC: "21600",
        MARITIME_REFRESH_COOLDOWN_SEC: "900",
        LOG_LEVEL: "info",
      }),
    ).toThrow(/MARITIME_ADMIN_API_KEY/);
  });
});
