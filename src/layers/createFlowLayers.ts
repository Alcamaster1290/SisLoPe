import { PathLayer, ArcLayer } from "@deck.gl/layers";
import { TripsLayer } from "@deck.gl/geo-layers";
import { getDepartmentForNode } from "@/data/departments";
import type { DepartmentId, FlowFeature, MapViewMode } from "@/types/logistics";
import { getFlowColor, getFlowStrokeWidth } from "@/utils/colorScale";

interface FlowLayerOptions {
  flowFeatures: FlowFeature[];
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  selectedDepartment: DepartmentId | null;
  showCorridors: boolean;
  showFlows: boolean;
  viewMode: MapViewMode;
  mapZoom: number;
  animationTime: number;
}

type FlowRegionFocus = "internal" | "linked" | "external" | "neutral";

interface FlowZoomProfile {
  widthScale: number;
  arcHeightScale: number;
  corridorAlpha: number;
  tripAlpha: number;
  trailLength: number;
  pulse: number;
}

interface FlowModeZoomCalibration {
  widthBoost: number;
  corridorAlphaBoost: number;
  tripAlphaBoost: number;
  trailBoost: number;
  arcHeightBoost: number;
  arcOpacityBoost: number;
  pulseBoost: number;
}

const FLOW_PROFILE_LOW: FlowZoomProfile = {
  widthScale: 0.78,
  arcHeightScale: 0.74,
  corridorAlpha: 0.5,
  tripAlpha: 0.62,
  trailLength: 64,
  pulse: 0.9,
};

const FLOW_PROFILE_MID: FlowZoomProfile = {
  widthScale: 0.94,
  arcHeightScale: 0.58,
  corridorAlpha: 0.68,
  tripAlpha: 0.78,
  trailLength: 82,
  pulse: 1,
};

const FLOW_PROFILE_HIGH: FlowZoomProfile = {
  widthScale: 1.08,
  arcHeightScale: 0.44,
  corridorAlpha: 0.84,
  tripAlpha: 0.92,
  trailLength: 98,
  pulse: 1.08,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, ratio: number): number {
  return start + (end - start) * ratio;
}

function interpolateFlowProfile(start: FlowZoomProfile, end: FlowZoomProfile, ratio: number): FlowZoomProfile {
  return {
    widthScale: lerp(start.widthScale, end.widthScale, ratio),
    arcHeightScale: lerp(start.arcHeightScale, end.arcHeightScale, ratio),
    corridorAlpha: lerp(start.corridorAlpha, end.corridorAlpha, ratio),
    tripAlpha: lerp(start.tripAlpha, end.tripAlpha, ratio),
    trailLength: lerp(start.trailLength, end.trailLength, ratio),
    pulse: lerp(start.pulse, end.pulse, ratio),
  };
}

function isEmphasized(feature: FlowFeature, hoveredNodeId: string | null, selectedNodeId: string | null): boolean {
  const { from, to } = feature.properties;
  return from === hoveredNodeId || to === hoveredNodeId || from === selectedNodeId || to === selectedNodeId;
}

export function getFlowZoomProfile(mapZoom: number): FlowZoomProfile {
  const zoom = clamp(mapZoom, 4.2, 9);

  if (zoom <= 6.2) {
    const ratio = (zoom - 4.2) / (6.2 - 4.2);
    return interpolateFlowProfile(FLOW_PROFILE_LOW, FLOW_PROFILE_MID, ratio);
  }

  const ratio = (zoom - 6.2) / (9 - 6.2);
  return interpolateFlowProfile(FLOW_PROFILE_MID, FLOW_PROFILE_HIGH, ratio);
}

export function getFlowViewProfile(viewMode: MapViewMode): {
  corridorBoost: number;
  tripBoost: number;
  widthBoost: number;
  pulseBoost: number;
  arcOpacity: number;
} {
  if (viewMode === "emphasis3d") {
    return {
      corridorBoost: 0.74,
      tripBoost: 0.48,
      widthBoost: 0.82,
      pulseBoost: 0.78,
      arcOpacity: 0,
    };
  }

  if (viewMode === "flows") {
    return {
      corridorBoost: 1.2,
      tripBoost: 1.18,
      widthBoost: 1.16,
      pulseBoost: 1.12,
      arcOpacity: 0.96,
    };
  }

  return {
    corridorBoost: 0.92,
    tripBoost: 0.74,
    widthBoost: 0.94,
    pulseBoost: 0.96,
    arcOpacity: 0,
  };
}

export function getFlowModeZoomCalibration(
  viewMode: MapViewMode,
  mapZoom: number,
): FlowModeZoomCalibration {
  const zoom = clamp(mapZoom, 4.2, 9);
  const lowBandRatio = clamp((zoom - 4.2) / (5.6 - 4.2), 0, 1);
  const highBandRatio = clamp((zoom - 7.2) / (9 - 7.2), 0, 1);

  if (viewMode === "flows") {
    if (zoom <= 5.6) {
      return {
        widthBoost: lerp(0.86, 0.96, lowBandRatio),
        corridorAlphaBoost: lerp(0.8, 0.92, lowBandRatio),
        tripAlphaBoost: lerp(0.76, 0.88, lowBandRatio),
        trailBoost: lerp(0.88, 0.98, lowBandRatio),
        arcHeightBoost: lerp(0.84, 0.94, lowBandRatio),
        arcOpacityBoost: lerp(0.78, 0.9, lowBandRatio),
        pulseBoost: lerp(0.92, 0.98, lowBandRatio),
      };
    }

    return {
      widthBoost: lerp(1, 0.96, highBandRatio),
      corridorAlphaBoost: lerp(1, 1.08, highBandRatio),
      tripAlphaBoost: lerp(1, 1.12, highBandRatio),
      trailBoost: lerp(1, 1.12, highBandRatio),
      arcHeightBoost: lerp(1, 0.9, highBandRatio),
      arcOpacityBoost: lerp(1, 1.04, highBandRatio),
      pulseBoost: lerp(1, 1.06, highBandRatio),
    };
  }

  if (viewMode === "emphasis3d") {
    if (zoom <= 5.6) {
      return {
        widthBoost: lerp(0.72, 0.8, lowBandRatio),
        corridorAlphaBoost: lerp(0.7, 0.78, lowBandRatio),
        tripAlphaBoost: lerp(0.56, 0.64, lowBandRatio),
        trailBoost: lerp(0.84, 0.9, lowBandRatio),
        arcHeightBoost: lerp(0.72, 0.68, lowBandRatio),
        arcOpacityBoost: 0,
        pulseBoost: lerp(0.9, 0.94, lowBandRatio),
      };
    }

    return {
      widthBoost: lerp(0.86, 0.8, highBandRatio),
      corridorAlphaBoost: lerp(0.84, 0.76, highBandRatio),
      tripAlphaBoost: lerp(0.74, 0.62, highBandRatio),
      trailBoost: lerp(0.94, 0.92, highBandRatio),
      arcHeightBoost: lerp(0.68, 0.66, highBandRatio),
      arcOpacityBoost: 0,
      pulseBoost: lerp(0.96, 0.96, highBandRatio),
    };
  }

  if (zoom <= 5.6) {
    return {
      widthBoost: lerp(0.88, 0.96, lowBandRatio),
      corridorAlphaBoost: lerp(0.86, 0.94, lowBandRatio),
      tripAlphaBoost: lerp(0.78, 0.9, lowBandRatio),
      trailBoost: lerp(0.92, 0.98, lowBandRatio),
      arcHeightBoost: lerp(0.9, 0.96, lowBandRatio),
      arcOpacityBoost: 0,
      pulseBoost: lerp(0.94, 0.98, lowBandRatio),
    };
  }

  return {
    widthBoost: lerp(1, 0.94, highBandRatio),
    corridorAlphaBoost: lerp(1, 1, highBandRatio),
    tripAlphaBoost: lerp(1, 1.04, highBandRatio),
    trailBoost: lerp(1, 1.06, highBandRatio),
    arcHeightBoost: lerp(1, 0.86, highBandRatio),
    arcOpacityBoost: 0,
    pulseBoost: lerp(1, 1, highBandRatio),
  };
}

function resolveFlowRegionFocus(
  feature: FlowFeature,
  selectedDepartment: DepartmentId | null,
): FlowRegionFocus {
  if (!selectedDepartment) return "neutral";
  const fromDepartment = getDepartmentForNode(feature.properties.sourceNode);
  const toDepartment = getDepartmentForNode(feature.properties.targetNode);

  if (fromDepartment === selectedDepartment && toDepartment === selectedDepartment) return "internal";
  if (fromDepartment === selectedDepartment || toDepartment === selectedDepartment) return "linked";
  return "external";
}

function getRegionMultiplier(regionFocus: FlowRegionFocus): { width: number; alpha: number } {
  if (regionFocus === "internal") return { width: 1.08, alpha: 1.1 };
  if (regionFocus === "linked") return { width: 1, alpha: 0.9 };
  if (regionFocus === "external") return { width: 0.9, alpha: 0.62 };
  return { width: 1, alpha: 1 };
}

export function createFlowLayers({
  flowFeatures,
  hoveredNodeId,
  selectedNodeId,
  selectedDepartment,
  showCorridors,
  showFlows,
  viewMode,
  mapZoom,
  animationTime,
}: FlowLayerOptions) {
  const profile = getFlowZoomProfile(mapZoom);
  const viewProfile = getFlowViewProfile(viewMode);
  const modeZoomCalibration = getFlowModeZoomCalibration(viewMode, mapZoom);
  const zoomArcFlattening = clamp(1 - Math.max(0, mapZoom - 6.8) * 0.12, 0.62, 1);
  const modeHeightBoost = viewMode === "flows" ? 1.08 : viewMode === "emphasis3d" ? 0.78 : 0.92;
  const corridorOpacity = (viewMode === "flows" ? 0.68 : viewMode === "emphasis3d" ? 0.48 : 0.6) *
    modeZoomCalibration.corridorAlphaBoost;
  const arcMinHeight = viewMode === "flows" ? 6400 : 3800;

  return [
    new PathLayer<FlowFeature>({
      id: "flow-corridors",
      data: flowFeatures,
      visible: showCorridors && viewMode !== "density",
      pickable: false,
      widthUnits: "pixels",
      widthMinPixels: 0.85,
      widthMaxPixels: 8.2,
      jointRounded: true,
      capRounded: true,
      opacity: corridorOpacity,
      getPath: (feature) => feature.geometry.coordinates as [number, number][],
      getWidth: (feature) => {
        const focus = resolveFlowRegionFocus(feature, selectedDepartment);
        const regionMultiplier = getRegionMultiplier(focus);
        return (
          getFlowStrokeWidth(feature.properties.importance) *
            profile.widthScale *
            viewProfile.widthBoost *
            modeZoomCalibration.widthBoost *
            regionMultiplier.width +
          (isEmphasized(feature, hoveredNodeId, selectedNodeId) ? 1.15 : 0)
        );
      },
      getColor: (feature) => {
        const focus = resolveFlowRegionFocus(feature, selectedDepartment);
        const regionMultiplier = getRegionMultiplier(focus);
        const baseAlpha =
          profile.corridorAlpha * viewProfile.corridorBoost * modeZoomCalibration.corridorAlphaBoost;
        return getFlowColor(
          feature.properties.mode,
          feature.properties.importance,
          Math.min(1, baseAlpha * regionMultiplier.alpha),
        );
      },
    }),
    new ArcLayer<FlowFeature>({
      id: "flow-arcs",
      data: flowFeatures,
      visible: showFlows && viewMode === "flows",
      pickable: false,
      numSegments: 48,
      greatCircle: false,
      widthUnits: "pixels",
      widthMinPixels: 0.85,
      widthMaxPixels: 8.2,
      getSourcePosition: (feature) => [feature.properties.sourceNode.lon, feature.properties.sourceNode.lat],
      getTargetPosition: (feature) => [feature.properties.targetNode.lon, feature.properties.targetNode.lat],
      getSourceColor: (feature) =>
        getFlowColor(
          feature.properties.mode,
          feature.properties.importance,
          0.52 * viewProfile.arcOpacity * modeZoomCalibration.arcOpacityBoost,
        ),
      getTargetColor: (feature) =>
        getFlowColor(
          feature.properties.mode,
          feature.properties.importance,
          0.16 * viewProfile.arcOpacity * modeZoomCalibration.arcOpacityBoost,
        ),
      getWidth: (feature) =>
        getFlowStrokeWidth(feature.properties.importance) *
        profile.widthScale *
        viewProfile.widthBoost *
        modeZoomCalibration.widthBoost,
      getHeight: (feature) =>
        clamp(
          feature.properties.distanceKm *
            780 *
            profile.arcHeightScale *
            zoomArcFlattening *
            modeHeightBoost *
            modeZoomCalibration.arcHeightBoost,
          arcMinHeight,
          132000,
        ),
    }),
    new TripsLayer<FlowFeature>({
      id: "flow-trips",
      data: flowFeatures,
      visible: showFlows && viewMode !== "density",
      pickable: false,
      widthUnits: "pixels",
      widthMinPixels: 0.85,
      widthMaxPixels: 7.6,
      capRounded: true,
      jointRounded: true,
      trailLength: Math.round(
        profile.trailLength *
          viewProfile.tripBoost *
          modeZoomCalibration.trailBoost *
          (mapZoom < 5.7 ? 0.9 : 1),
      ),
      currentTime: animationTime * profile.pulse * viewProfile.pulseBoost * modeZoomCalibration.pulseBoost,
      fadeTrail: true,
      getPath: (feature) => feature.geometry.coordinates as [number, number][],
      getTimestamps: (feature) => feature.properties.timestamps,
      getWidth: (feature) => {
        const focus = resolveFlowRegionFocus(feature, selectedDepartment);
        const regionMultiplier = getRegionMultiplier(focus);
        return (
          getFlowStrokeWidth(feature.properties.importance) *
            profile.widthScale *
            viewProfile.widthBoost *
            modeZoomCalibration.widthBoost *
            regionMultiplier.width +
          (isEmphasized(feature, hoveredNodeId, selectedNodeId) ? 0.7 : 0)
        );
      },
      getColor: (feature) => {
        const focus = resolveFlowRegionFocus(feature, selectedDepartment);
        const regionMultiplier = getRegionMultiplier(focus);
        const alpha = Math.min(
          1,
          profile.tripAlpha * viewProfile.tripBoost * modeZoomCalibration.tripAlphaBoost * regionMultiplier.alpha,
        );
        return getFlowColor(feature.properties.mode, feature.properties.importance, alpha);
      },
    }),
  ];
}
