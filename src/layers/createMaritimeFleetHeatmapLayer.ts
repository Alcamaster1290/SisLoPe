import { PolygonLayer } from "@deck.gl/layers";
import { cellToBoundary, isValidCell } from "h3-js";
import type { MapViewMode } from "@/types/logistics";
import type { MaritimeFleetHeatmapCell } from "@/types/maritimeHeatmap";

interface CreateMaritimeFleetHeatmapLayerOptions {
  cells: MaritimeFleetHeatmapCell[];
  visible: boolean;
  viewMode: MapViewMode;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mix(start: number, end: number, ratio: number): number {
  return Math.round(start + (end - start) * ratio);
}

export function getFleetHeatmapColor(
  cell: MaritimeFleetHeatmapCell,
  maxPresenceCount: number,
  viewMode: MapViewMode,
): [number, number, number, number] {
  const safeMax = Math.max(1, maxPresenceCount);
  const ratio = clamp(Math.log(cell.presenceCount + 1) / Math.log(safeMax + 1), 0, 1);
  const alphaBase = viewMode === "density" ? 72 : viewMode === "flows" ? 94 : 110;

  return [
    mix(26, 232, ratio),
    mix(86, 184, ratio),
    mix(118, 96, ratio),
    mix(alphaBase, 188, ratio),
  ];
}

export function createMaritimeFleetHeatmapLayer({
  cells,
  visible,
  viewMode,
}: CreateMaritimeFleetHeatmapLayerOptions) {
  const safeCells = visible ? cells.filter((cell) => isValidCell(cell.cellId)) : [];
  const maxPresenceCount = safeCells.reduce(
    (maxValue, cell) => Math.max(maxValue, cell.presenceCount),
    0,
  );

  return new PolygonLayer<MaritimeFleetHeatmapCell>({
    id: "maritime-fleet-heatmap",
    data: safeCells,
    visible,
    pickable: false,
    filled: true,
    stroked: false,
    extruded: false,
    opacity: viewMode === "density" ? 0.3 : 0.42,
    getPolygon: (cell) => cellToBoundary(cell.cellId, true).map(([lon, lat]) => [lon, lat]),
    getFillColor: (cell) => getFleetHeatmapColor(cell, maxPresenceCount, viewMode),
  });
}
