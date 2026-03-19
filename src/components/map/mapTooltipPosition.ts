import type { LogisticsNode, TooltipState } from "@/types/logistics";

export interface MapProjectLike {
  project: (coordinates: [number, number]) => { x: number; y: number };
}

export function projectTooltipFromNode(
  map: MapProjectLike,
  node: LogisticsNode,
): TooltipState {
  const point = map.project([node.lon, node.lat]);

  return {
    nodeId: node.id,
    x: point.x,
    y: point.y,
  };
}
