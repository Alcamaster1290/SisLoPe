import "dotenv/config";
import { z } from "zod";

const booleanFlag = (defaultValue: boolean) =>
  z
    .union([z.boolean(), z.string().trim().toLowerCase()])
    .optional()
    .transform((value, ctx) => {
      if (value === undefined) {
        return defaultValue;
      }

      if (typeof value === "boolean") {
        return value;
      }

      if (value === "true" || value === "1") {
        return true;
      }

      if (value === "false" || value === "0") {
        return false;
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Valor booleano invalido",
      });

      return z.NEVER;
    });

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    DATABASE_URL: z.string().trim().min(1, "DATABASE_URL es obligatorio"),
    FRONTEND_ORIGIN: z.string().trim().url().default("http://localhost:5173"),
    MARITIME_ADMIN_API_KEY: z.string().trim().optional(),
    MARITIME_CACHE_SUMMARY_TTL_SEC: z.coerce.number().int().positive().default(60),
    MARITIME_CACHE_ALERTS_TTL_SEC: z.coerce.number().int().positive().default(60),
    MARITIME_CACHE_TIMELINE_TTL_SEC: z.coerce.number().int().positive().default(300),
    MARITIME_CACHE_HEATMAP_LATEST_TTL_SEC: z.coerce.number().int().positive().default(3600),
    MARITIME_CACHE_HEATMAP_DAILY_TTL_SEC: z.coerce.number().int().positive().default(21600),
    MARITIME_ENABLE_WRITE_ENDPOINTS: booleanFlag(true),
    MARITIME_ENABLE_MANUAL_REFRESH: booleanFlag(false),
    MARITIME_REFRESH_COOLDOWN_SEC: z.coerce.number().int().positive().default(900),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  })
  .superRefine((env, ctx) => {
    if (env.MARITIME_ENABLE_WRITE_ENDPOINTS && !env.MARITIME_ADMIN_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MARITIME_ADMIN_API_KEY"],
        message: "MARITIME_ADMIN_API_KEY es obligatorio cuando las escrituras estan habilitadas",
      });
    }
  });

export interface MaritimeApiEnv {
  nodeEnv: "development" | "test" | "production";
  port: number;
  databaseUrl: string;
  frontendOrigin: string;
  maritimeAdminApiKey: string | null;
  cacheSummaryTtlMs: number;
  cacheAlertsTtlMs: number;
  cacheTimelineTtlMs: number;
  cacheHeatmapLatestTtlMs: number;
  cacheHeatmapDailyTtlMs: number;
  enableWriteEndpoints: boolean;
  enableManualRefresh: boolean;
  refreshCooldownMs: number;
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): MaritimeApiEnv {
  const parsed = envSchema.parse(source);

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    frontendOrigin: parsed.FRONTEND_ORIGIN,
    maritimeAdminApiKey: parsed.MARITIME_ADMIN_API_KEY ?? null,
    cacheSummaryTtlMs: parsed.MARITIME_CACHE_SUMMARY_TTL_SEC * 1000,
    cacheAlertsTtlMs: parsed.MARITIME_CACHE_ALERTS_TTL_SEC * 1000,
    cacheTimelineTtlMs: parsed.MARITIME_CACHE_TIMELINE_TTL_SEC * 1000,
    cacheHeatmapLatestTtlMs: parsed.MARITIME_CACHE_HEATMAP_LATEST_TTL_SEC * 1000,
    cacheHeatmapDailyTtlMs: parsed.MARITIME_CACHE_HEATMAP_DAILY_TTL_SEC * 1000,
    enableWriteEndpoints: parsed.MARITIME_ENABLE_WRITE_ENDPOINTS,
    enableManualRefresh: parsed.MARITIME_ENABLE_MANUAL_REFRESH,
    refreshCooldownMs: parsed.MARITIME_REFRESH_COOLDOWN_SEC * 1000,
    logLevel: parsed.LOG_LEVEL,
  };
}

