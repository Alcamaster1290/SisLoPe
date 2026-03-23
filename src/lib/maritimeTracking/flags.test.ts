import { describe, expect, it } from "vitest";
import { readMaritimeTrackingFeatureFlags } from "@/lib/maritimeTracking/flags";

describe("maritime tracking flags", () => {
  it("defaults to a disabled feature with no endpoint", () => {
    expect(readMaritimeTrackingFeatureFlags({})).toEqual({
      enabled: false,
      mapEnabled: false,
      heatmapEnabled: false,
      apiBaseUrl: null,
    });
  });

  it("normalizes enabled flags and trims the read-model URL", () => {
    expect(
      readMaritimeTrackingFeatureFlags({
        VITE_ENABLE_MARITIME_TRACKING: "true",
        VITE_ENABLE_MARITIME_TRACKING_MAP: "1",
        VITE_MARITIME_API_BASE_URL: " https://tracking.example.com/api/ ",
      }),
    ).toEqual({
      enabled: true,
      mapEnabled: true,
      heatmapEnabled: true,
      apiBaseUrl: "https://tracking.example.com/api",
    });
  });

  it("keeps the heatmap disabled without api base url", () => {
    expect(
      readMaritimeTrackingFeatureFlags({
        VITE_ENABLE_MARITIME_TRACKING: "true",
        VITE_ENABLE_MARITIME_TRACKING_MAP: "true",
      }),
    ).toEqual({
      enabled: true,
      mapEnabled: false,
      heatmapEnabled: false,
      apiBaseUrl: null,
    });
  });
});
