import type { LogisticsNode } from "@/types/logistics";
import {
  CATEGORY_META,
  FLOW_MODE_META,
  MACROZONE_META,
  STRATEGIC_LEVEL_META,
  TERRAIN_META,
} from "@/utils/colorScale";
import type { FlowMode, Macrozone, StrategicLevel, Terrain } from "@/types/logistics";

export function formatCoordinate(value: number, axis: "lat" | "lon"): string {
  const suffix = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "O";
  return `${Math.abs(value).toFixed(4)} deg ${suffix}`;
}

export function formatLocation(node: LogisticsNode): string {
  return [node.district, node.province, node.region].filter(Boolean).join(", ");
}

export function formatCategory(category: LogisticsNode["category"]): string {
  return CATEGORY_META[category].label;
}

export function formatStrategicLevel(level: StrategicLevel): string {
  return STRATEGIC_LEVEL_META[level];
}

export function formatMacrozone(macrozone: Macrozone): string {
  return MACROZONE_META[macrozone];
}

export function formatTerrain(terrain?: Terrain): string {
  return terrain ? TERRAIN_META[terrain] : "Sin clasificacion";
}

export function formatFlowMode(mode: FlowMode): string {
  return FLOW_MODE_META[mode];
}
