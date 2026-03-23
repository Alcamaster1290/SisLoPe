export interface MaritimeTrackingEnv {
  VITE_ENABLE_MARITIME_TRACKING?: string;
  VITE_ENABLE_MARITIME_TRACKING_MAP?: string;
  VITE_MARITIME_API_BASE_URL?: string;
}

export interface MaritimeTrackingFeatureFlags {
  enabled: boolean;
  mapEnabled: boolean;
  heatmapEnabled: boolean;
  apiBaseUrl: string | null;
}

type MaritimeTrackingEnvLike = Partial<Record<keyof MaritimeTrackingEnv, string | undefined>>;

function parseBooleanFlag(value?: string): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function normalizeApiBaseUrl(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

export function readMaritimeTrackingFeatureFlags(
  env: MaritimeTrackingEnvLike = import.meta.env as MaritimeTrackingEnvLike,
): MaritimeTrackingFeatureFlags {
  const enabled = parseBooleanFlag(env.VITE_ENABLE_MARITIME_TRACKING);
  const apiBaseUrl = normalizeApiBaseUrl(env.VITE_MARITIME_API_BASE_URL);
  const heatmapEnabled = enabled && parseBooleanFlag(env.VITE_ENABLE_MARITIME_TRACKING_MAP) && Boolean(apiBaseUrl);

  return {
    enabled,
    mapEnabled: heatmapEnabled,
    heatmapEnabled,
    apiBaseUrl,
  };
}

export function getMaritimeTrackingFeatureFlags(): MaritimeTrackingFeatureFlags {
  return readMaritimeTrackingFeatureFlags(import.meta.env as MaritimeTrackingEnvLike);
}
