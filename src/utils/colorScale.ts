import { scaleLinear, scaleOrdinal } from "d3";
import type {
  FlowImportance,
  FlowMode,
  LogisticsNode,
  Macrozone,
  NodeCategory,
  StrategicLevel,
  Terrain,
} from "@/types/logistics";

export type RgbColor = [number, number, number];
export type RgbaColor = [number, number, number, number];

const CATEGORY_COLOR_HEX: Record<NodeCategory, string> = {
  port_sea: "#4e7fd7",
  port_river: "#54b7c8",
  airport: "#8664a9",
  border: "#c55f5b",
  freezone: "#5b9d73",
  inland_hub: "#d28c50",
  corridor_anchor: "#d6b95a",
};

const categoryScale = scaleOrdinal<NodeCategory, string>()
  .domain(Object.keys(CATEGORY_COLOR_HEX) as NodeCategory[])
  .range(Object.values(CATEGORY_COLOR_HEX));

const strategicRadiusScale = scaleLinear().domain([0, 2]).range([4.5, 10.5]);
const strategicGlowScale = scaleLinear().domain([0, 2]).range([10, 24]);
const flowOpacityScale = scaleLinear().domain([0, 1]).range([120, 210]);
const strategicWeightScale = scaleLinear().domain([0, 2]).range([0.75, 1.65]);

const strategicIndex: Record<StrategicLevel, number> = {
  complementary: 0,
  regional: 1,
  national: 2,
};

const flowImportanceIndex: Record<FlowImportance, number> = {
  secondary: 0,
  primary: 1,
};

export const CATEGORY_META: Record<
  NodeCategory,
  { label: string; shortLabel: string; color: string; icon: string }
> = {
  port_sea: {
    label: "Puerto marítimo",
    shortLabel: "Mar",
    color: categoryScale("port_sea"),
    icon: "PM",
  },
  port_river: {
    label: "Puerto fluvial",
    shortLabel: "Río",
    color: categoryScale("port_river"),
    icon: "PF",
  },
  airport: {
    label: "Aeropuerto",
    shortLabel: "Air",
    color: categoryScale("airport"),
    icon: "AE",
  },
  border: {
    label: "Frontera / CEBAF",
    shortLabel: "CE",
    color: categoryScale("border"),
    icon: "FR",
  },
  freezone: {
    label: "Zona franca / ZED",
    shortLabel: "ZF",
    color: categoryScale("freezone"),
    icon: "ZF",
  },
  inland_hub: {
    label: "Hub interior",
    shortLabel: "Hub",
    color: categoryScale("inland_hub"),
    icon: "HB",
  },
  corridor_anchor: {
    label: "Ancla de corredor",
    shortLabel: "Cor",
    color: categoryScale("corridor_anchor"),
    icon: "CA",
  },
};

export const STRATEGIC_LEVEL_META: Record<StrategicLevel, string> = {
  national: "Nacional",
  regional: "Regional",
  complementary: "Complementario",
};

export const MACROZONE_META: Record<Macrozone, string> = {
  north: "Norte",
  center: "Centro",
  south: "Sur",
  amazon: "Amazonía",
  border: "Frontera",
};

export const TERRAIN_META: Record<Terrain, string> = {
  coast: "Costa",
  highlands: "Sierra",
  jungle: "Selva",
  lake: "Lacustre",
};

export const FLOW_MODE_META: Record<FlowMode, string> = {
  land: "Terrestre",
  sea: "Marítimo",
  river: "Fluvial",
};

const FLOW_COLOR_RGB: Record<FlowMode, RgbColor> = {
  land: [209, 158, 92],
  sea: [96, 138, 224],
  river: [96, 197, 210],
};

export function hexToRgb(hex: string): RgbColor {
  const normalized = hex.replace("#", "");
  const integer = Number.parseInt(normalized, 16);
  return [(integer >> 16) & 255, (integer >> 8) & 255, integer & 255];
}

export function getCategoryColorHex(category: NodeCategory): string {
  return categoryScale(category);
}

export function getCategoryColorRgb(category: NodeCategory): RgbColor {
  return hexToRgb(getCategoryColorHex(category));
}

export function getNodeRadius(node: Pick<LogisticsNode, "strategicLevel" | "category">): number {
  const strategicRadius = strategicRadiusScale(strategicIndex[node.strategicLevel]);
  return node.category === "corridor_anchor" ? strategicRadius + 1.5 : strategicRadius;
}

export function getNodeGlowRadius(node: Pick<LogisticsNode, "strategicLevel">): number {
  return strategicGlowScale(strategicIndex[node.strategicLevel]);
}

export function getFlowColor(mode: FlowMode, importance: FlowImportance, alpha = 1): RgbaColor {
  const [r, g, b] = FLOW_COLOR_RGB[mode];
  return [r, g, b, Math.round(flowOpacityScale(flowImportanceIndex[importance]) * alpha)];
}

export function getFlowStrokeWidth(importance: FlowImportance): number {
  return importance === "primary" ? 4 : 2.4;
}

export function getFlowDashArray(mode: FlowMode): [number, number] {
  if (mode === "sea") return [4, 2];
  if (mode === "river") return [2, 2];
  return [7, 3];
}

export function getNodeWeight(node: Pick<LogisticsNode, "strategicLevel">): number {
  return strategicWeightScale(strategicIndex[node.strategicLevel]);
}
