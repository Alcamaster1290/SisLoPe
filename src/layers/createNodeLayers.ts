import type { PickingInfo } from "@deck.gl/core";
import { HexagonLayer } from "@deck.gl/aggregation-layers";
import { PathLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import { getDepartmentForNode } from "@/data/departments";
import type { DepartmentId, LogisticsNode, MapViewMode, NodeLabelDatum } from "@/types/logistics";
import { getCategoryColorRgb, getNodeRadius, getNodeWeight } from "@/utils/colorScale";

interface NodeLayerOptions {
  nodes: LogisticsNode[];
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  viewMode: MapViewMode;
  showLabels: boolean;
  showFleetHeatmap: boolean;
  clustersActive: boolean;
  mapZoom: number;
  departmentFocused: boolean;
  selectedDepartment: DepartmentId | null;
  labelData: NodeLabelDatum[];
  onHover: (info: PickingInfo<LogisticsNode>) => void;
  onClick: (info: PickingInfo<LogisticsNode>, event: unknown) => void;
}

interface NodeModeProfile {
  nodeAlpha: number;
  nodeLineAlpha: number;
  haloAlpha: number;
  highlightLineAlpha: number;
  labelFluxAlpha: number;
  labelBackgroundAlpha: number;
  densityOpacity: number;
  densityCoverage: number;
  densityElevationScale: number;
  densityRadius: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, ratio: number): number {
  return start + (end - start) * ratio;
}

export function getNodeModeProfile(viewMode: MapViewMode, mapZoom: number): NodeModeProfile {
  const zoomRatio = clamp((mapZoom - 5.1) / 3.3, 0, 1);

  if (viewMode === "emphasis3d") {
    return {
      nodeAlpha: 182,
      nodeLineAlpha: 164,
      haloAlpha: 70,
      highlightLineAlpha: 246,
      labelFluxAlpha: 0.9,
      labelBackgroundAlpha: 186,
      densityOpacity: 0.58,
      densityCoverage: 0.84,
      densityElevationScale: 40,
      densityRadius: 42000,
    };
  }

  if (viewMode === "flows") {
    return {
      nodeAlpha: 156,
      nodeLineAlpha: 146,
      haloAlpha: 40,
      highlightLineAlpha: 224,
      labelFluxAlpha: 0.72,
      labelBackgroundAlpha: 154,
      densityOpacity: 0.56,
      densityCoverage: 0.84,
      densityElevationScale: 40,
      densityRadius: 42000,
    };
  }

  if (viewMode === "density") {
    return {
      nodeAlpha: 104,
      nodeLineAlpha: 122,
      haloAlpha: 30,
      highlightLineAlpha: 198,
      labelFluxAlpha: 0.62,
      labelBackgroundAlpha: 142,
      densityOpacity: lerp(0.5, 0.68, zoomRatio),
      densityCoverage: lerp(0.78, 0.9, zoomRatio),
      densityElevationScale: lerp(34, 56, zoomRatio),
      densityRadius: Math.round(lerp(52000, 33000, zoomRatio)),
    };
  }

  return {
    nodeAlpha: 214,
    nodeLineAlpha: 180,
    haloAlpha: 42,
    highlightLineAlpha: 240,
    labelFluxAlpha: 0.78,
    labelBackgroundAlpha: mapZoom >= 7.2 ? 182 : 162,
    densityOpacity: 0.54,
    densityCoverage: 0.82,
    densityElevationScale: 38,
    densityRadius: 42000,
  };
}

function getModeAdjustedNodeAlpha(node: LogisticsNode, viewMode: MapViewMode, baseAlpha: number): number {
  if (viewMode === "emphasis3d") {
    if (node.strategicLevel === "national") return Math.min(238, baseAlpha + 36);
    if (node.strategicLevel === "regional") return Math.min(212, baseAlpha + 16);
    return Math.max(96, baseAlpha - 42);
  }

  if (viewMode === "flows") {
    if (node.category === "port_sea" || node.category === "port_river") return Math.min(218, baseAlpha + 24);
    if (node.strategicLevel === "national") return Math.min(204, baseAlpha + 14);
    if (node.strategicLevel === "complementary") return Math.max(98, baseAlpha - 24);
  }

  return baseAlpha;
}

function getModeAdjustedNodeRadius(node: LogisticsNode, viewMode: MapViewMode): number {
  const baseRadius = getNodeRadius(node);

  if (viewMode === "density") {
    return Math.max(3.4, baseRadius - 1.4);
  }

  if (viewMode === "emphasis3d") {
    if (node.strategicLevel === "national") return baseRadius + 1.45;
    if (node.strategicLevel === "regional") return baseRadius + 0.65;
    return Math.max(4, baseRadius - 0.45);
  }

  if (viewMode === "flows") {
    if (node.category === "port_sea" || node.category === "port_river") return baseRadius + 0.35;
    return Math.max(4, baseRadius - 0.15);
  }

  return baseRadius;
}

function isFocusNode(nodeId: string, hoveredNodeId: string | null, selectedNodeId: string | null): boolean {
  return nodeId === hoveredNodeId || nodeId === selectedNodeId;
}

function isPortCategory(node: LogisticsNode): boolean {
  return node.category === "port_sea" || node.category === "port_river";
}

function isRegionalStrategic(node: LogisticsNode): boolean {
  return node.strategicLevel === "national" || node.strategicLevel === "regional";
}

export function shouldDisplayLabelByZoom(
  node: LogisticsNode,
  mapZoom: number,
  selectedDepartment: DepartmentId | null,
  hoveredNodeId: string | null,
  selectedNodeId: string | null,
): boolean {
  const isFocused = node.id === hoveredNodeId || node.id === selectedNodeId;
  const inSelectedDepartment =
    selectedDepartment !== null && getDepartmentForNode(node) === selectedDepartment;

  if (mapZoom < 6) return false;
  if (mapZoom < 6.8) return isFocused || isPortCategory(node);
  if (mapZoom < 7.6) {
    return isFocused || isPortCategory(node) || (inSelectedDepartment && isRegionalStrategic(node));
  }
  return true;
}

function getMaxLabelCount(mapZoom: number, departmentFocused: boolean): number {
  if (mapZoom < 6.8) return departmentFocused ? 22 : 18;
  if (mapZoom < 7.6) {
    return departmentFocused ? 36 : 28;
  }
  return departmentFocused ? 56 : 44;
}

export function getEmphasisNodes(
  nodes: LogisticsNode[],
  hoveredNodeId: string | null,
  selectedNodeId: string | null,
  viewMode: MapViewMode,
): LogisticsNode[] {
  const emphasisNodes = new Map<string, LogisticsNode>();

  if (viewMode === "emphasis3d") {
    for (const node of nodes) {
      if (node.strategicLevel === "national" || node.strategicLevel === "regional") {
        emphasisNodes.set(node.id, node);
      }
    }
  }

  for (const focusId of [hoveredNodeId, selectedNodeId]) {
    if (!focusId) continue;
    const focusNode = nodes.find((node) => node.id === focusId);
    if (focusNode) emphasisNodes.set(focusNode.id, focusNode);
  }

  return [...emphasisNodes.values()]
    .sort((left, right) => {
      const leftPriority =
        left.id === selectedNodeId
          ? 1000
          : left.id === hoveredNodeId
            ? 900
            : left.strategicLevel === "national"
              ? 700
              : 480;
      const rightPriority =
        right.id === selectedNodeId
          ? 1000
          : right.id === hoveredNodeId
            ? 900
            : right.strategicLevel === "national"
              ? 700
              : 480;

      if (leftPriority !== rightPriority) {
        return rightPriority - leftPriority;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, 26);
}

export function createNodeLayers({
  nodes,
  hoveredNodeId,
  selectedNodeId,
  viewMode,
  showLabels,
  showFleetHeatmap,
  clustersActive,
  mapZoom,
  departmentFocused,
  selectedDepartment,
  labelData,
  onHover,
  onClick,
}: NodeLayerOptions) {
  const modeProfile = getNodeModeProfile(viewMode, mapZoom);
  const visibleNodes = !clustersActive;
  const showNodeSymbols = visibleNodes && viewMode !== "density";
  const emphasisNodes = getEmphasisNodes(nodes, hoveredNodeId, selectedNodeId, viewMode);
  const highlightedNodes = nodes.filter((node) =>
    isFocusNode(node.id, hoveredNodeId, selectedNodeId),
  );
  const modeAccentNodes =
    viewMode === "emphasis3d"
      ? emphasisNodes
      : viewMode === "flows"
        ? highlightedNodes
        : [];
  const visibleLabelData = labelData
    .filter((entry) =>
      shouldDisplayLabelByZoom(
        entry.node,
        mapZoom,
        selectedDepartment,
        hoveredNodeId,
        selectedNodeId,
      ),
    )
    .sort((left, right) => right.priority - left.priority)
    .slice(0, getMaxLabelCount(mapZoom, departmentFocused));

  return [
    new HexagonLayer<LogisticsNode>({
      id: "node-density",
      data: nodes,
      visible: viewMode === "density" && !showFleetHeatmap,
      pickable: false,
      extruded: true,
      gpuAggregation: true,
      radius: modeProfile.densityRadius,
      elevationScale: modeProfile.densityElevationScale,
      coverage: modeProfile.densityCoverage,
      opacity: modeProfile.densityOpacity,
      getPosition: (node) => [node.lon, node.lat],
      getColorWeight: (node) => getNodeWeight(node),
      getElevationWeight: (node) => getNodeWeight(node),
      colorAggregation: "SUM",
      elevationAggregation: "SUM",
      lowerPercentile: 5,
      upperPercentile: 97,
      colorRange: [
        [10, 28, 45],
        [25, 62, 102],
        [53, 100, 150],
        [90, 143, 198],
        [135, 176, 216],
        [205, 176, 110],
        [234, 204, 130],
      ],
      material: {
        ambient: 0.58,
        diffuse: 0.68,
        shininess: 28,
        specularColor: [196, 210, 226],
      },
    }),
    new ScatterplotLayer<LogisticsNode>({
      id: "node-halo",
      data: viewMode === "emphasis3d" ? emphasisNodes : highlightedNodes,
      visible: showNodeSymbols,
      pickable: false,
      stroked: false,
      filled: true,
      radiusUnits: "pixels",
      radiusMinPixels: 12,
      radiusMaxPixels: viewMode === "emphasis3d" ? 56 : 48,
      getPosition: (node) => [node.lon, node.lat],
      getRadius: (node) => getNodeRadius(node) + (viewMode === "emphasis3d" ? 14 : 11),
      getFillColor: (node) => [...getCategoryColorRgb(node.category), modeProfile.haloAlpha],
    }),
    new ScatterplotLayer<LogisticsNode>({
      id: "node-mode-accent",
      data: modeAccentNodes,
      visible: showNodeSymbols && modeAccentNodes.length > 0,
      pickable: false,
      stroked: true,
      filled: false,
      radiusUnits: "pixels",
      lineWidthUnits: "pixels",
      lineWidthMinPixels: viewMode === "emphasis3d" ? 2 : 1.5,
      radiusMinPixels: 11,
      radiusMaxPixels: 32,
      getPosition: (node) => [node.lon, node.lat],
      getRadius: (node) => getNodeRadius(node) + (viewMode === "emphasis3d" ? 8 : 5),
      getLineColor: (node) => [...getCategoryColorRgb(node.category), viewMode === "emphasis3d" ? 170 : 128],
    }),
    new ScatterplotLayer<LogisticsNode>({
      id: "node-scatter",
      data: nodes,
      visible: showNodeSymbols,
      pickable: true,
      stroked: true,
      filled: true,
      radiusUnits: "pixels",
      lineWidthUnits: "pixels",
      lineWidthMinPixels: 1,
      radiusMinPixels: 4,
      radiusMaxPixels: 18,
      getPosition: (node) => [node.lon, node.lat],
      getRadius: (node) => getModeAdjustedNodeRadius(node, viewMode),
      getFillColor: (node) => [
        ...getCategoryColorRgb(node.category),
        getModeAdjustedNodeAlpha(node, viewMode, modeProfile.nodeAlpha),
      ],
      getLineColor: () => [232, 240, 247, modeProfile.nodeLineAlpha],
      updateTriggers: {
        getFillColor: [viewMode, modeProfile.nodeAlpha],
        getLineColor: [viewMode, modeProfile.nodeLineAlpha],
        getRadius: [viewMode],
      },
      onHover,
      onClick,
    }),
    new ScatterplotLayer<LogisticsNode>({
      id: "node-highlight",
      data: highlightedNodes,
      visible: visibleNodes,
      pickable: false,
      stroked: true,
      filled: false,
      radiusUnits: "pixels",
      lineWidthUnits: "pixels",
      lineWidthMinPixels: 2,
      radiusMinPixels: 10,
      radiusMaxPixels: 26,
      getPosition: (node) => [node.lon, node.lat],
      getRadius: (node) => getNodeRadius(node) + 5,
      getLineColor: (node) => [...getCategoryColorRgb(node.category), modeProfile.highlightLineAlpha],
    }),
    new PathLayer<NodeLabelDatum>({
      id: "node-label-flux",
      data: visibleLabelData,
      visible: showNodeSymbols && showLabels,
      pickable: false,
      widthUnits: "pixels",
      capRounded: true,
      jointRounded: true,
      opacity: 0.78,
      getPath: (entry) => entry.fluxPath,
      getWidth: (entry) =>
        (entry.node.strategicLevel === "national" ? 1.55 : 1.2) *
        (mapZoom >= 7.4 ? 1.12 : 1) *
        (viewMode === "flows" ? 0.92 : 1),
      getColor: (entry) => [
        ...getCategoryColorRgb(entry.node.category),
        Math.round((departmentFocused ? 178 : mapZoom >= 7 ? 156 : 132) * modeProfile.labelFluxAlpha),
      ],
    }),
    new TextLayer<NodeLabelDatum>({
      id: "node-labels",
      data: visibleLabelData,
      visible: showNodeSymbols && showLabels,
      pickable: false,
      billboard: true,
      fontFamily: "Rajdhani, sans-serif",
      fontWeight: 700,
      characterSet: "auto",
      getPosition: (entry) => entry.labelPosition,
      getText: (entry) => entry.node.name,
      getSize: (entry) => {
        const zoomBase = mapZoom >= 8 ? 13.6 : mapZoom >= 6.7 ? 12.2 : 11.2;
        return entry.node.strategicLevel === "national" ? zoomBase + 1 : zoomBase;
      },
      sizeUnits: "pixels",
      getTextAnchor: (entry) => (entry.side === "right" ? "start" : "end"),
      getAlignmentBaseline: () => "center",
      getPixelOffset: (entry) => (entry.side === "right" ? [6, 0] : [-6, 0]),
      getColor: () => [232, 240, 247, 228],
      getBackgroundColor: () => [4, 10, 16, modeProfile.labelBackgroundAlpha],
      background: true,
      backgroundPadding: [6, 3],
      getBorderColor: () => [112, 148, 182, 70],
      getBorderWidth: 1,
    }),
  ];
}
