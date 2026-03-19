import type { MapViewMode } from "@/types/logistics";

interface NodeLayerVisibilityOptions {
  clustersVisible: boolean;
  viewMode: MapViewMode;
  deckHealthy: boolean;
}

export function shouldShowFallbackNodeLayers({
  clustersVisible,
  viewMode,
  deckHealthy,
}: NodeLayerVisibilityOptions): boolean {
  return !clustersVisible && viewMode !== "density" && !deckHealthy;
}
