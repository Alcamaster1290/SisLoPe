import {
  along,
  bezierSpline,
  center,
  distance,
  lineString,
  point,
} from "@turf/turf";
import type { Feature, LineString, Position } from "geojson";
import type {
  CameraPadding,
  CoordinateOverride,
  FlowFeature,
  FlowFeatureCollection,
  LogisticsFlow,
  LogisticsNode,
  MapCameraState,
  MapViewMode,
  NodeFeature,
  NodeFeatureCollection,
} from "@/types/logistics";

export const PERU_BOUNDS = [
  [-84.8, -20.1],
  [-67.2, 1.8],
] as const;

export const INITIAL_CAMERA_STATE: MapCameraState = {
  longitude: -75.35,
  latitude: -9.45,
  zoom: 4.5,
  pitch: 24,
  bearing: 0,
};

export const DEFAULT_CAMERA_PADDING: CameraPadding = {
  top: 92,
  right: 104,
  bottom: 92,
  left: 104,
};

export const PRESENTATION_SEQUENCE = [
  "callao",
  "chancay",
  "paita",
  "matarani",
  "ilo",
  "zofratacna",
  "desaguadero",
] as const;

export function getModeCameraPreset(mode: MapViewMode): { pitch: number; bearing: number } {
  if (mode === "emphasis3d") {
    return { pitch: 58, bearing: -10 };
  }

  if (mode === "flows") {
    return { pitch: 42, bearing: 0 };
  }

  if (mode === "density") {
    return { pitch: 26, bearing: 0 };
  }

  return { pitch: 24, bearing: 0 };
}

const coordinateOverrides: Partial<Record<string, CoordinateOverride>> = {};

export function resolveNodeCoordinates(
  node: LogisticsNode,
): { lat: number; lon: number; source: "dataset" | "override"; trace?: string } {
  const override = coordinateOverrides[node.id];
  if (!override) {
    return { lat: node.lat, lon: node.lon, source: "dataset" };
  }

  return {
    lat: override.lat,
    lon: override.lon,
    source: "override",
    trace: override.source,
  };
}

export function nodeToFeature(node: LogisticsNode): NodeFeature {
  const resolved = resolveNodeCoordinates(node);

  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [resolved.lon, resolved.lat],
    },
    properties: {
      ...node,
      lat: resolved.lat,
      lon: resolved.lon,
      kind: "node",
    },
  };
}

export function nodesToFeatureCollection(nodes: LogisticsNode[]): NodeFeatureCollection {
  return {
    type: "FeatureCollection",
    features: nodes.map(nodeToFeature),
  };
}

function getCurvatureForMode(mode: LogisticsFlow["mode"]): number {
  if (mode === "air") return 0.2;
  if (mode === "sea") return 0.24;
  if (mode === "river") return 0.16;
  return 0.08;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function sampleCubicBezier(
  start: Position,
  control1: Position,
  control2: Position,
  end: Position,
  segments = 72,
): Position[] {
  const safeSegments = Math.max(16, segments);
  const coordinates: Position[] = [];

  for (let index = 0; index <= safeSegments; index += 1) {
    const t = index / safeSegments;
    const mt = 1 - t;
    const x =
      mt ** 3 * start[0] +
      3 * mt ** 2 * t * control1[0] +
      3 * mt * t ** 2 * control2[0] +
      t ** 3 * end[0];
    const y =
      mt ** 3 * start[1] +
      3 * mt ** 2 * t * control1[1] +
      3 * mt * t ** 2 * control2[1] +
      t ** 3 * end[1];

    coordinates.push([x, y]);
  }

  return coordinates;
}

function getControlPoint(start: Position, end: Position, curvature: number): Position {
  const midLon = (start[0] + end[0]) / 2;
  const midLat = (start[1] + end[1]) / 2;
  const deltaLon = end[0] - start[0];
  const deltaLat = end[1] - start[1];
  const normalLon = -deltaLat;
  const normalLat = deltaLon;
  const magnitude = Math.sqrt(normalLon ** 2 + normalLat ** 2) || 1;
  const offset = Math.sqrt(deltaLon ** 2 + deltaLat ** 2) * curvature;

  return [midLon + (normalLon / magnitude) * offset, midLat + (normalLat / magnitude) * offset];
}

function createSeaLaneCoordinates(start: Position, end: Position): Position[] {
  const latDelta = end[1] - start[1];
  const latSpan = Math.abs(latDelta);
  const lonSpan = Math.abs(end[0] - start[0]);
  const offshoreShift = clamp(0.68 + latSpan * 0.1 + lonSpan * 0.24, 0.62, 2.2);
  const minBoundLon = PERU_BOUNDS[0][0] + 0.34;
  const seaOuterLon = clamp(
    Math.min(start[0], end[0]) - offshoreShift,
    minBoundLon,
    Math.min(start[0], end[0]) - 0.3,
  );
  const direction = latDelta >= 0 ? 1 : -1;
  const lateralBias = clamp(latSpan * 0.06, 0.02, 0.16) * direction;
  const control1: Position = [
    lerp(start[0], seaOuterLon, 0.72),
    start[1] + latDelta * 0.33 + lateralBias,
  ];
  const control2: Position = [
    lerp(end[0], seaOuterLon, 0.72),
    start[1] + latDelta * 0.67 - lateralBias,
  ];

  const coordinates = sampleCubicBezier(start, control1, control2, end, 96);

  return coordinates.map((coordinate, index) => {
    if (index === 0 || index === coordinates.length - 1) {
      return coordinate;
    }

    const t = index / (coordinates.length - 1);
    const smoothOffshorePush = Math.sin(Math.PI * t) * clamp(offshoreShift * 0.14, 0.04, 0.3);
    return [coordinate[0] - smoothOffshorePush, coordinate[1]];
  });
}

function createFlowCoordinates(source: LogisticsNode, target: LogisticsNode, mode: LogisticsFlow["mode"]): Position[] {
  const sourceCoord = resolveNodeCoordinates(source);
  const targetCoord = resolveNodeCoordinates(target);
  const start: Position = [sourceCoord.lon, sourceCoord.lat];
  const end: Position = [targetCoord.lon, targetCoord.lat];

  if (mode === "sea") {
    return createSeaLaneCoordinates(start, end);
  }

  const control = getControlPoint(start, end, getCurvatureForMode(mode));
  const baseLine = lineString([start, control, end]);
  const curved = bezierSpline(baseLine, { resolution: 6000, sharpness: 0.8 });

  if (curved.geometry.type === "LineString") {
    return curved.geometry.coordinates;
  }

  return [start, end];
}

function createTimestamps(coordinates: Position[], distanceKm: number): number[] {
  const duration = Math.max(160, Math.min(520, distanceKm * 5.2));
  const lastIndex = Math.max(1, coordinates.length - 1);
  return coordinates.map((_, index) => Number(((duration / lastIndex) * index).toFixed(2)));
}

export function flowsToFeatureCollection(
  flows: LogisticsFlow[],
  nodeMap: Map<string, LogisticsNode>,
): FlowFeatureCollection {
  const features: FlowFeature[] = [];

  for (const flow of flows) {
    const sourceNode = nodeMap.get(flow.from);
    const targetNode = nodeMap.get(flow.to);

    if (!sourceNode || !targetNode) continue;

    const coordinates = createFlowCoordinates(sourceNode, targetNode, flow.mode);
    const distanceKm = Number(distance(point(coordinates[0]), point(coordinates.at(-1)!), { units: "kilometers" }).toFixed(1));

    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates,
      },
      properties: {
        ...flow,
        kind: "flow",
        distanceKm,
        sourceNode,
        targetNode,
        timestamps: createTimestamps(coordinates, distanceKm),
      },
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

export function getFlowMidpoint(feature: Feature<LineString>): Position {
  const coordinates = feature.geometry.coordinates;
  const totalDistance = distance(point(coordinates[0]), point(coordinates.at(-1)!), {
    units: "kilometers",
  });
  const midpoint = along(feature, totalDistance / 2, { units: "kilometers" });
  return midpoint.geometry.coordinates;
}

export function getNodeFocusCamera(node: LogisticsNode, mode: MapViewMode): Partial<MapCameraState> {
  const baseZoom =
    node.strategicLevel === "national" ? 7.1 : node.strategicLevel === "regional" ? 6.6 : 6.25;
  const modePreset = getModeCameraPreset(mode);
  const macroBearing =
    node.macrozone === "south" || node.macrozone === "border"
      ? -8
      : node.macrozone === "amazon"
        ? 8
        : 0;

  return {
    longitude: node.lon,
    latitude: node.lat,
    zoom: mode === "density" ? Math.max(5.8, baseZoom - 0.6) : baseZoom,
    pitch: modePreset.pitch,
    bearing: modePreset.bearing + macroBearing,
  };
}

export function getSuggestedPadding(isDesktop: boolean): CameraPadding {
  return isDesktop
    ? DEFAULT_CAMERA_PADDING
    : {
        top: 88,
        right: 34,
        bottom: 300,
        left: 34,
      };
}

function getDepartmentSpan(bounds: [number, number, number, number]): number {
  const lonSpan = Math.max(0.001, bounds[2] - bounds[0]);
  const latSpan = Math.max(0.001, bounds[3] - bounds[1]);
  return Math.max(lonSpan, latSpan * 1.22);
}

function getDepartmentMaxZoom(span: number): number {
  if (span <= 0.32) return 9;
  if (span <= 0.55) return 8.65;
  if (span <= 0.9) return 8.35;
  if (span <= 1.4) return 8;
  if (span <= 2.1) return 7.55;
  return 7.2;
}

function getDepartmentPitch(mode: MapViewMode): number {
  return getModeCameraPreset(mode).pitch;
}

export function getDepartmentViewPreset(
  bounds: [number, number, number, number],
  isDesktop: boolean,
  mode: MapViewMode,
): {
  padding: CameraPadding;
  duration: number;
  maxZoom: number;
  pitch: number;
  bearing: number;
} {
  const span = getDepartmentSpan(bounds);
  const maxZoom = getDepartmentMaxZoom(span);
  const pitch = getDepartmentPitch(mode);
  const padding = isDesktop
    ? {
        top: 82,
        right: 96,
        bottom: 84,
        left: 96,
      }
    : {
        top: 82,
        right: 32,
        bottom: 286,
        left: 32,
      };

  return {
    padding,
    duration: 1600,
    maxZoom,
    pitch,
    bearing: getModeCameraPreset(mode).bearing,
  };
}

export function getDatasetCenter(nodes: LogisticsNode[]): Position {
  const collection = nodesToFeatureCollection(nodes);
  return center(collection).geometry.coordinates;
}
