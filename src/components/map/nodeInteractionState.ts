import type { CameraCommand, LogisticsNode, MapViewMode } from "@/types/logistics";
import { getNodeFocusCamera, getSuggestedPadding } from "@/utils/geo";

export function shouldShowHoverTooltip(selectedNodeId: string | null, isMapExpanded: boolean): boolean {
  return !isMapExpanded || !selectedNodeId;
}

export function buildNodeFocusCommand(
  node: LogisticsNode,
  viewMode: MapViewMode,
  isDesktop: boolean,
): Omit<CameraCommand, "nonce"> {
  const focus = getNodeFocusCamera(node, viewMode);

  return {
    kind: "focus",
    nodeId: node.id,
    zoom: focus.zoom ?? 6.6,
    pitch: focus.pitch ?? 32,
    bearing: focus.bearing ?? 0,
    duration: 1500,
    padding: getSuggestedPadding(isDesktop),
  };
}
