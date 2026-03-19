import { describe, expect, it } from "vitest";
import { shouldShowFallbackNodeLayers } from "@/components/map/nodeLayerVisibility";

describe("shouldShowFallbackNodeLayers", () => {
  it("uses Deck as the source of truth when it is healthy", () => {
    expect(
      shouldShowFallbackNodeLayers({
        clustersVisible: false,
        viewMode: "standard",
        deckHealthy: true,
      }),
    ).toBe(false);
  });

  it("reactivates MapLibre fallback when Deck is degraded", () => {
    expect(
      shouldShowFallbackNodeLayers({
        clustersVisible: false,
        viewMode: "standard",
        deckHealthy: false,
      }),
    ).toBe(true);
  });

  it("keeps fallback hidden while clusters are active or in density mode", () => {
    expect(
      shouldShowFallbackNodeLayers({
        clustersVisible: true,
        viewMode: "standard",
        deckHealthy: false,
      }),
    ).toBe(false);

    expect(
      shouldShowFallbackNodeLayers({
        clustersVisible: false,
        viewMode: "density",
        deckHealthy: false,
      }),
    ).toBe(false);
  });
});
