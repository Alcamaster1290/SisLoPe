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

type CalibrationBand = {
  low: FlowModeZoomCalibration;
  mid: FlowModeZoomCalibration;
  high: FlowModeZoomCalibration;
};

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

function interpolateCalibration(
  start: FlowModeZoomCalibration,
  end: FlowModeZoomCalibration,
  ratio: number,
): FlowModeZoomCalibration {
  return {
    widthBoost: lerp(start.widthBoost, end.widthBoost, ratio),
    corridorAlphaBoost: lerp(start.corridorAlphaBoost, end.corridorAlphaBoost, ratio),
    tripAlphaBoost: lerp(start.tripAlphaBoost, end.tripAlphaBoost, ratio),
    trailBoost: lerp(start.trailBoost, end.trailBoost, ratio),
    arcHeightBoost: lerp(start.arcHeightBoost, end.arcHeightBoost, ratio),
    arcOpacityBoost: lerp(start.arcOpacityBoost, end.arcOpacityBoost, ratio),
    pulseBoost: lerp(start.pulseBoost, end.pulseBoost, ratio),
  };
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
  const lowToMidRatio = clamp((zoom - 4.2) / (6.2 - 4.2), 0, 1);
  const midToHighRatio = clamp((zoom - 6.2) / (9 - 6.2), 0, 1);

  const band: CalibrationBand =
    viewMode === "flows"
      ? {
          low: {
            widthBoost: 0.86,
            corridorAlphaBoost: 0.8,
            tripAlphaBoost: 0.76,
            trailBoost: 0.88,
            arcHeightBoost: 0.84,
            arcOpacityBoost: 0.78,
            pulseBoost: 0.92,
          },
          mid: {
            widthBoost: 0.98,
            corridorAlphaBoost: 0.94,
            tripAlphaBoost: 0.9,
            trailBoost: 1,
            arcHeightBoost: 0.95,
            arcOpacityBoost: 0.92,
            pulseBoost: 0.99,
          },
          high: {
            widthBoost: 0.96,
            corridorAlphaBoost: 1.08,
            tripAlphaBoost: 1.12,
            trailBoost: 1.12,
            arcHeightBoost: 0.9,
            arcOpacityBoost: 1.04,
            pulseBoost: 1.06,
          },
        }
      : viewMode === "emphasis3d"
        ? {
            low: {
              widthBoost: 0.72,
              corridorAlphaBoost: 0.7,
              tripAlphaBoost: 0.56,
              trailBoost: 0.84,
              arcHeightBoost: 0.72,
              arcOpacityBoost: 0,
              pulseBoost: 0.9,
            },
            mid: {
              widthBoost: 0.82,
              corridorAlphaBoost: 0.8,
              tripAlphaBoost: 0.66,
              trailBoost: 0.91,
              arcHeightBoost: 0.68,
              arcOpacityBoost: 0,
              pulseBoost: 0.95,
            },
            high: {
              widthBoost: 0.8,
              corridorAlphaBoost: 0.76,
              tripAlphaBoost: 0.62,
              trailBoost: 0.92,
              arcHeightBoost: 0.66,
              arcOpacityBoost: 0,
              pulseBoost: 0.96,
            },
          }
        : {
            low: {
              widthBoost: 0.88,
              corridorAlphaBoost: 0.86,
              tripAlphaBoost: 0.78,
              trailBoost: 0.92,
              arcHeightBoost: 0.9,
              arcOpacityBoost: 0,
              pulseBoost: 0.94,
            },
            mid: {
              widthBoost: 0.97,
              corridorAlphaBoost: 0.95,
              tripAlphaBoost: 0.91,
              trailBoost: 0.99,
              arcHeightBoost: 0.95,
              arcOpacityBoost: 0,
              pulseBoost: 0.99,
            },
            high: {
              widthBoost: 0.94,
              corridorAlphaBoost: 1,
              tripAlphaBoost: 1.04,
              trailBoost: 1.06,
              arcHeightBoost: 0.86,
              arcOpacityBoost: 0,
              pulseBoost: 1,
            },
          };

  if (zoom <= 6.2) {
    return interpolateCalibration(band.low, band.mid, lowToMidRatio);
  }

  return interpolateCalibration(band.mid, band.high, midToHighRatio);
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
  const corridorOpacity = viewMode === "flows" ? 0.68 : viewMode === "emphasis3d" ? 0.48 : 0.6;
  const zoomRatio = clamp((mapZoom - 4.2) / (9 - 4.2), 0, 1);
  const arcMinHeight =
    (viewMode === "flows" ? 1 : 0.82) * Math.round(lerp(6200, 2600, zoomRatio));
  const arcMaxHeight = Math.round(lerp(154000, 98000, zoomRatio));

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
          Math.pow(feature.properties.distanceKm, 0.78) *
            1700 *
            profile.arcHeightScale *
            zoomArcFlattening *
            modeHeightBoost *
            modeZoomCalibration.arcHeightBoost,
          arcMinHeight,
          arcMaxHeight,
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
