import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WebMercatorViewport, type Deck, type MapView, type PickingInfo } from "@deck.gl/core";
import type { FeatureCollection, GeoJsonProperties, Point } from "geojson";
import maplibregl from "maplibre-gl";
import { getDepartmentForNode } from "@/data/departments";
import { departmentRegions } from "@/data/departmentRegions";
import peruBoundary from "@/data/peruBoundary";
import { DeckCanvasOverlay } from "@/components/map/DeckCanvasOverlay";
import { NodeTooltip } from "@/components/map/NodeTooltip";
import { RenderStatusOverlay } from "@/components/map/RenderStatusOverlay";
import { createFlowLayers } from "@/layers/createFlowLayers";
import { createNodeLayers } from "@/layers/createNodeLayers";
import { getMapStyle } from "@/lib/mapStyle";
import { useMapStore } from "@/store/useMapStore";
import type {
  LogisticsFlow,
  LogisticsNode,
  MapRenderSyncState,
  MapStatus,
  MapViewMode,
  NodeLabelDatum,
  DepartmentId,
  RenderHealth,
  TooltipState,
} from "@/types/logistics";
import {
  flowsToFeatureCollection,
  getModeCameraPreset,
  getNodeFocusCamera,
  getSuggestedPadding,
  INITIAL_CAMERA_STATE,
  nodesToFeatureCollection,
  PERU_BOUNDS,
} from "@/utils/geo";
import { getCategoryColorHex } from "@/utils/colorScale";

const CLUSTER_SOURCE_ID = "logistics-clusters";
const CLUSTER_LAYER_ID = "logistics-clusters-circle";
const UNCLUSTERED_LAYER_ID = "logistics-unclustered-points";
const PERU_SOURCE_ID = "peru-boundary";
const PERU_FILL_LAYER_ID = "peru-boundary-fill";
const PERU_LINE_LAYER_ID = "peru-boundary-line";
const NODE_SOURCE_ID = "logistics-nodes";
const NODE_HALO_LAYER_ID = "logistics-node-halo";
const NODE_CIRCLE_LAYER_ID = "logistics-node-circle";
const DEPARTMENT_SOURCE_ID = "department-regions";
const DEPARTMENT_FILL_LAYER_ID = "department-regions-fill";
const DEPARTMENT_LINE_LAYER_ID = "department-regions-line";
const CLUSTER_THRESHOLD = 5.7;
const MAP_READY_TIMEOUT_MS = 7000;
const PICKABLE_NODE_LAYER_ID = "node-scatter";

interface LogisticsMapProps {
  nodes: LogisticsNode[];
  flows: LogisticsFlow[];
  nodeMap: Map<string, LogisticsNode>;
  isDesktop: boolean;
  onSelectDepartment: (departmentId: DepartmentId | null) => void;
}

type ClusterFeature = GeoJSON.Feature<Point, GeoJsonProperties>;

function setLayerVisibility(map: maplibregl.Map, layerId: string, visible: boolean): void {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  }
}

function syncClusterVisibility(map: maplibregl.Map, visible: boolean): void {
  setLayerVisibility(map, CLUSTER_LAYER_ID, visible);
  setLayerVisibility(map, UNCLUSTERED_LAYER_ID, visible);
}

function syncNodeVisibility(map: maplibregl.Map, visible: boolean): void {
  setLayerVisibility(map, NODE_HALO_LAYER_ID, visible);
  setLayerVisibility(map, NODE_CIRCLE_LAYER_ID, visible);
}

function installClusterLayers(map: maplibregl.Map, data: FeatureCollection): void {
  if (map.getSource(CLUSTER_SOURCE_ID)) return;

  map.addSource(CLUSTER_SOURCE_ID, {
    type: "geojson",
    data,
    cluster: true,
    clusterRadius: 42,
    clusterMaxZoom: 6,
  });

  map.addLayer({
    id: CLUSTER_LAYER_ID,
    type: "circle",
    source: CLUSTER_SOURCE_ID,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        "#1d3a54",
        10,
        "#35567a",
        20,
        "#7d6b3e",
      ],
      "circle-radius": [
        "step",
        ["get", "point_count"],
        16,
        8,
        22,
        20,
        30,
      ],
      "circle-opacity": 0.92,
      "circle-stroke-color": "#d8e3ef",
      "circle-stroke-width": 1.2,
    },
  });

  map.addLayer({
    id: UNCLUSTERED_LAYER_ID,
    type: "circle",
    source: CLUSTER_SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": 5,
      "circle-color": "#9fc3e3",
      "circle-opacity": 0.88,
      "circle-stroke-color": "#eff6ff",
      "circle-stroke-width": 1,
    },
  });
}

function installPeruBoundaryLayers(map: maplibregl.Map): void {
  if (map.getSource(PERU_SOURCE_ID)) return;

  map.addSource(PERU_SOURCE_ID, {
    type: "geojson",
    data: peruBoundary as unknown as GeoJSON.GeoJSON,
  });

  const beforeId = map
    .getStyle()
    .layers?.find((layer) => layer.type === "symbol")?.id;

  map.addLayer(
    {
      id: PERU_FILL_LAYER_ID,
      type: "fill",
      source: PERU_SOURCE_ID,
      paint: {
        "fill-color": "#1e4b74",
        "fill-opacity": 0.32,
      },
    },
    beforeId,
  );

  map.addLayer(
    {
      id: PERU_LINE_LAYER_ID,
      type: "line",
      source: PERU_SOURCE_ID,
      paint: {
        "line-color": "#b9d2ec",
        "line-opacity": 1,
        "line-width": 2.4,
        "line-blur": 0.45,
      },
    },
    beforeId,
  );
}

function installNodeFallbackLayers(map: maplibregl.Map, data: FeatureCollection): void {
  if (!map.getSource(NODE_SOURCE_ID)) {
    map.addSource(NODE_SOURCE_ID, {
      type: "geojson",
      data,
    });
  }

  const categoryMatchExpression: maplibregl.ExpressionSpecification = [
    "match",
    ["get", "category"],
    "port_sea",
    getCategoryColorHex("port_sea"),
    "port_river",
    getCategoryColorHex("port_river"),
    "airport",
    getCategoryColorHex("airport"),
    "border",
    getCategoryColorHex("border"),
    "freezone",
    getCategoryColorHex("freezone"),
    "inland_hub",
    getCategoryColorHex("inland_hub"),
    "corridor_anchor",
    getCategoryColorHex("corridor_anchor"),
    "#9fc3e3",
  ];

  const radiusExpression: maplibregl.ExpressionSpecification = [
    "match",
    ["get", "strategicLevel"],
    "national",
    7.8,
    "regional",
    6.1,
    4.9,
  ];

  if (!map.getLayer(NODE_HALO_LAYER_ID)) {
    map.addLayer({
      id: NODE_HALO_LAYER_ID,
      type: "circle",
      source: NODE_SOURCE_ID,
      paint: {
        "circle-radius": [
          "+",
          radiusExpression,
          6.5,
        ],
        "circle-color": categoryMatchExpression,
        "circle-opacity": 0.18,
        "circle-blur": 0.5,
      },
    });
  }

  if (!map.getLayer(NODE_CIRCLE_LAYER_ID)) {
    map.addLayer({
      id: NODE_CIRCLE_LAYER_ID,
      type: "circle",
      source: NODE_SOURCE_ID,
      paint: {
        "circle-radius": radiusExpression,
        "circle-color": categoryMatchExpression,
        "circle-opacity": 0.9,
        "circle-stroke-color": "#edf4fb",
        "circle-stroke-width": 1.15,
      },
    });
  }
}

function installDepartmentLayers(map: maplibregl.Map): void {
  if (!map.getSource(DEPARTMENT_SOURCE_ID)) {
    map.addSource(DEPARTMENT_SOURCE_ID, {
      type: "geojson",
      data: departmentRegions as unknown as GeoJSON.GeoJSON,
    });
  }

  if (!map.getLayer(DEPARTMENT_FILL_LAYER_ID)) {
    map.addLayer({
      id: DEPARTMENT_FILL_LAYER_ID,
      type: "fill",
      source: DEPARTMENT_SOURCE_ID,
      paint: {
        "fill-color": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          "#325f87",
          ["boolean", ["feature-state", "hover"], false],
          "#2a5277",
          "#1a3a57",
        ],
        "fill-opacity": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          0.22,
          ["boolean", ["feature-state", "hover"], false],
          0.15,
          0.06,
        ],
      },
    });
  }

  if (!map.getLayer(DEPARTMENT_LINE_LAYER_ID)) {
    map.addLayer({
      id: DEPARTMENT_LINE_LAYER_ID,
      type: "line",
      source: DEPARTMENT_SOURCE_ID,
      paint: {
        "line-color": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          "#bbd3ea",
          ["boolean", ["feature-state", "hover"], false],
          "#9dbad8",
          "#58789c",
        ],
        "line-opacity": 0.56,
        "line-width": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          1.45,
          ["boolean", ["feature-state", "hover"], false],
          1.15,
          0.78,
        ],
      },
    });
  }
}

function getDepartmentIdFromFeature(feature?: GeoJSON.Feature): DepartmentId | null {
  const raw = feature?.properties?.id ?? feature?.id;
  return typeof raw === "string" ? (raw as DepartmentId) : null;
}

function buildSyncState(map: maplibregl.Map): MapRenderSyncState {
  const center = map.getCenter();
  const container = map.getContainer();
  const canvas = map.getCanvas();

  return {
    longitude: center.lng,
    latitude: center.lat,
    zoom: map.getZoom(),
    pitch: map.getPitch(),
    bearing: map.getBearing(),
    width: Math.max(1, container.clientWidth || canvas.clientWidth),
    height: Math.max(1, container.clientHeight || canvas.clientHeight),
  };
}

function getOperationalStatus(renderHealth: RenderHealth): MapStatus {
  if (!renderHealth.maplibre) return "failed";
  if (!renderHealth.deck) return "degraded";
  return "ready";
}

function getModeAtmosphereClass(viewMode: MapViewMode): string {
  if (viewMode === "emphasis3d") {
    return "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(104,164,224,0.17),transparent_30%),radial-gradient(circle_at_74%_28%,rgba(222,170,96,0.14),transparent_26%),linear-gradient(180deg,rgba(5,10,16,0.1),rgba(4,8,13,0.44))]";
  }

  if (viewMode === "flows") {
    return "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_24%,rgba(72,142,208,0.13),transparent_33%),radial-gradient(circle_at_82%_20%,rgba(204,150,76,0.11),transparent_28%),linear-gradient(136deg,rgba(8,16,25,0.14)_0%,rgba(5,11,18,0.02)_42%,rgba(12,21,33,0.16)_100%)]";
  }

  if (viewMode === "density") {
    return "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(98,144,196,0.13),transparent_36%),radial-gradient(circle_at_38%_68%,rgba(215,171,103,0.11),transparent_30%),linear-gradient(180deg,rgba(4,9,15,0.1),rgba(4,8,13,0.4))]";
  }

  return "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(79,108,148,0.12),transparent_26%),radial-gradient(circle_at_76%_22%,rgba(209,158,92,0.08),transparent_22%),linear-gradient(180deg,rgba(5,10,16,0.12),rgba(3,7,13,0.38))]";
}

export function LogisticsMap({
  nodes,
  flows,
  nodeMap,
  isDesktop,
  onSelectDepartment,
}: LogisticsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const deckRef = useRef<Deck<MapView[]> | null>(null);
  const effectiveViewModeRef = useRef(useMapStore.getState().viewMode);
  const onSelectDepartmentRef = useRef(onSelectDepartment);
  const nodeMapRef = useRef(nodeMap);
  const isDesktopRef = useRef(isDesktop);
  const [clustersActive, setClustersActive] = useState(INITIAL_CAMERA_STATE.zoom < CLUSTER_THRESHOLD);
  const [animationTime, setAnimationTime] = useState(0);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [syncState, setSyncState] = useState<MapRenderSyncState | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const hoveredNodeId = useMapStore((state) => state.hoveredNodeId);
  const selectedNodeId = useMapStore((state) => state.selectedNodeId);
  const viewMode = useMapStore((state) => state.viewMode);
  const showLabels = useMapStore((state) => state.showLabels);
  const showFlows = useMapStore((state) => state.showFlows);
  const showCorridors = useMapStore((state) => state.showCorridors);
  const focusedDepartment = useMapStore((state) => state.selectedDepartment);
  const hoveredDepartment = useMapStore((state) => state.hoveredDepartment);
  const cameraCommand = useMapStore((state) => state.cameraCommand);
  const mapStatus = useMapStore((state) => state.mapStatus);
  const renderHealth = useMapStore((state) => state.renderHealth);
  const setHoveredNode = useMapStore((state) => state.setHoveredNode);
  const setHoveredDepartment = useMapStore((state) => state.setHoveredDepartment);
  const setCamera = useMapStore((state) => state.setCamera);
  const setMapStatus = useMapStore((state) => state.setMapStatus);
  const setRendererHealth = useMapStore((state) => state.setRendererHealth);
  const resetRenderPipeline = useMapStore((state) => state.resetRenderPipeline);

  const nodeFeatures = useMemo(() => nodesToFeatureCollection(nodes), [nodes]);
  const flowFeatures = useMemo(() => flowsToFeatureCollection(flows, nodeMap).features, [flows, nodeMap]);
  const nodeFeaturesRef = useRef(nodeFeatures);
  const clustersActiveRef = useRef(clustersActive);
  const hoveredNode = tooltip ? nodeMap.get(tooltip.nodeId) ?? null : null;
  const effectiveViewMode = viewMode;
  const mapZoom = syncState?.zoom ?? INITIAL_CAMERA_STATE.zoom;
  const departmentFocused = Boolean(focusedDepartment);
  const selectedDepartmentRef = useRef<DepartmentId | null>(focusedDepartment);
  const atmosphereClass = useMemo(() => getModeAtmosphereClass(effectiveViewMode), [effectiveViewMode]);

  const labelData = useMemo<NodeLabelDatum[]>(() => {
    if (!syncState || clustersActive || mapZoom < 6) return [];

    const viewport = new WebMercatorViewport({
      width: syncState.width,
      height: syncState.height,
      longitude: syncState.longitude,
      latitude: syncState.latitude,
      zoom: syncState.zoom,
      pitch: syncState.pitch,
      bearing: syncState.bearing,
    });

    const isPort = (node: LogisticsNode): boolean =>
      node.category === "port_sea" || node.category === "port_river";

    const isFocus = (node: LogisticsNode): boolean =>
      node.id === selectedNodeId || node.id === hoveredNodeId;

    const isRegionalStrategic = (node: LogisticsNode): boolean =>
      node.strategicLevel === "national" || node.strategicLevel === "regional";

    const nodeDepartment = (node: LogisticsNode): DepartmentId | null => getDepartmentForNode(node);

    const shouldShowByZoom = (node: LogisticsNode): boolean => {
      if (mapZoom < 6.8) {
        return isFocus(node) || isPort(node);
      }
      if (mapZoom < 7.6) {
        if (isFocus(node) || isPort(node)) return true;
        if (!focusedDepartment) return false;
        return nodeDepartment(node) === focusedDepartment && isRegionalStrategic(node);
      }
      return true;
    };

    const getPriority = (node: LogisticsNode): number => {
      if (node.id === selectedNodeId) return 1000;
      if (node.id === hoveredNodeId) return 900;

      const portWeight = isPort(node) ? 420 : 0;
      const strategicWeight =
        node.strategicLevel === "national" ? 260 : node.strategicLevel === "regional" ? 140 : 60;
      const departmentWeight = focusedDepartment && nodeDepartment(node) === focusedDepartment ? 70 : 0;
      return portWeight + strategicWeight + departmentWeight;
    };

    const limit = mapZoom < 6.8 ? 30 : mapZoom < 7.6 ? 52 : 80;
    const candidates = [...nodes]
      .filter(shouldShowByZoom)
      .sort((left, right) => {
        const diff = getPriority(right) - getPriority(left);
        if (diff !== 0) return diff;
        return left.name.localeCompare(right.name);
      })
      .slice(0, limit);

    const occupiedBoxes: Array<{ minX: number; minY: number; maxX: number; maxY: number }> = [];
    const placedLabels: NodeLabelDatum[] = [];

    for (let index = 0; index < candidates.length; index += 1) {
      const node = candidates[index];
      const projected = viewport.project([node.lon, node.lat]);
      const side = node.lon >= syncState.longitude ? "right" : "left";
      const sideSign = side === "right" ? 1 : -1;
      const strategicOffset =
        node.strategicLevel === "national" ? 11 : node.strategicLevel === "regional" ? 7 : 4;
      const portOffset = isPort(node) ? 5 : 0;
      const offsetX = sideSign * (20 + (index % 4) * 6 + strategicOffset);
      const offsetY = -(14 + (index % 5) * 4 + portOffset);
      const labelX = projected[0] + offsetX;
      const labelY = projected[1] + offsetY;
      const labelWidth = Math.min(240, node.name.length * 7 + 22);
      const labelHeight = 20;
      const boxPadding = 6;
      const box =
        side === "right"
          ? {
              minX: labelX + 4,
              minY: labelY - labelHeight / 2,
              maxX: labelX + 4 + labelWidth,
              maxY: labelY + labelHeight / 2,
            }
          : {
              minX: labelX - 4 - labelWidth,
              minY: labelY - labelHeight / 2,
              maxX: labelX - 4,
              maxY: labelY + labelHeight / 2,
            };

      const forcePlacement = node.id === selectedNodeId || node.id === hoveredNodeId;
      const collides = occupiedBoxes.some(
        (occupied) =>
          box.minX - boxPadding < occupied.maxX &&
          box.maxX + boxPadding > occupied.minX &&
          box.minY - boxPadding < occupied.maxY &&
          box.maxY + boxPadding > occupied.minY,
      );

      if (collides && !forcePlacement) continue;

      occupiedBoxes.push(box);

      const controlX = projected[0] + offsetX * 0.45 + sideSign * 8;
      const controlY = projected[1] + offsetY * 0.5 - 2;
      const labelPosition = viewport.unproject([labelX, labelY]) as [number, number];
      const controlPosition = viewport.unproject([controlX, controlY]) as [number, number];

      placedLabels.push({
        node,
        labelPosition,
        fluxPath: [
          [node.lon, node.lat],
          controlPosition,
          labelPosition,
        ],
        priority: getPriority(node),
        side,
      });
    }

    return placedLabels;
  }, [clustersActive, focusedDepartment, hoveredNodeId, mapZoom, nodes, selectedNodeId, syncState]);

  const clearHoveredState = useCallback(
    (map?: maplibregl.Map | null) => {
      setHoveredNode(null);
      setTooltip(null);
      if (map) {
        map.getCanvas().style.cursor = "grab";
      }
    },
    [setHoveredNode],
  );

  const applyPickedNode = useCallback(
    (info: PickingInfo<LogisticsNode>, map?: maplibregl.Map | null) => {
      if (!info.object || info.x === undefined || info.y === undefined) {
        clearHoveredState(map);
        return;
      }

      setHoveredNode(info.object.id);
      setTooltip({
        nodeId: info.object.id,
        x: info.x,
        y: info.y,
      });

      if (map) {
        map.getCanvas().style.cursor = "pointer";
      }
    },
    [clearHoveredState, setHoveredNode],
  );

  const pickNodeAtPoint = useCallback(
    (x: number, y: number): PickingInfo<LogisticsNode> | null => {
      if (clustersActiveRef.current || !deckRef.current) return null;

      const info = deckRef.current.pickObject({
        x,
        y,
        radius: 10,
        layerIds: [PICKABLE_NODE_LAYER_ID],
      }) as PickingInfo<LogisticsNode>;

      return info.object ? info : null;
    },
    [],
  );

  const deckLayers = useMemo(() => {
    return [
      ...createFlowLayers({
        flowFeatures,
        hoveredNodeId,
        selectedNodeId,
        selectedDepartment: focusedDepartment,
        showCorridors,
        showFlows,
        viewMode: effectiveViewMode,
        mapZoom,
        animationTime,
      }),
      ...createNodeLayers({
        nodes,
        hoveredNodeId,
        selectedNodeId,
        viewMode: effectiveViewMode,
        showLabels,
        clustersActive,
        mapZoom,
        departmentFocused,
        selectedDepartment: focusedDepartment,
        labelData,
        onHover: () => undefined,
        onClick: () => undefined,
      }),
    ];
  }, [
    animationTime,
    clustersActive,
    departmentFocused,
    effectiveViewMode,
    flowFeatures,
    focusedDepartment,
    hoveredNodeId,
    labelData,
    mapZoom,
    nodes,
    selectedNodeId,
    showCorridors,
    showFlows,
    showLabels,
  ]);

  useEffect(() => {
    nodeFeaturesRef.current = nodeFeatures;
  }, [nodeFeatures]);

  useEffect(() => {
    effectiveViewModeRef.current = effectiveViewMode;
    const map = mapRef.current;
    if (!map) return;

    const clustersVisible = map.getZoom() < CLUSTER_THRESHOLD && effectiveViewMode !== "density";
    syncClusterVisibility(map, clustersVisible);
    syncNodeVisibility(map, !clustersVisible && effectiveViewMode !== "density");
    setClustersActive(clustersVisible);
  }, [effectiveViewMode]);

  useEffect(() => {
    selectedDepartmentRef.current = focusedDepartment;
  }, [focusedDepartment]);

  useEffect(() => {
    onSelectDepartmentRef.current = onSelectDepartment;
  }, [onSelectDepartment]);

  useEffect(() => {
    nodeMapRef.current = nodeMap;
  }, [nodeMap]);

  useEffect(() => {
    isDesktopRef.current = isDesktop;
  }, [isDesktop]);

  useEffect(() => {
    clustersActiveRef.current = clustersActive;
  }, [clustersActive]);

  useEffect(() => {
    if (effectiveViewMode === "density" || !showFlows) {
      setAnimationTime(0);
      return;
    }

    let frame = 0;
    let previous = 0;

    const loop = (time: number) => {
      if (time - previous > 36) {
        setAnimationTime(time % 520);
        previous = time;
      }
      frame = window.requestAnimationFrame(loop);
    };

    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [effectiveViewMode, showFlows]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    resetRenderPipeline();
    setTooltip(null);
    setSyncState(null);

    let idleResolved = false;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getMapStyle(),
      center: [INITIAL_CAMERA_STATE.longitude, INITIAL_CAMERA_STATE.latitude],
      zoom: INITIAL_CAMERA_STATE.zoom,
      pitch: INITIAL_CAMERA_STATE.pitch,
      bearing: INITIAL_CAMERA_STATE.bearing,
      maxBounds: PERU_BOUNDS as maplibregl.LngLatBoundsLike,
      attributionControl: false,
      renderWorldCopies: false,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
    map.doubleClickZoom.disable();
    map.getCanvas().style.cursor = "grab";

    const syncCameraState = () => {
      const sync = buildSyncState(map);
      const clustersVisible = sync.zoom < CLUSTER_THRESHOLD && effectiveViewModeRef.current !== "density";
      const nodeFallbackVisible = !clustersVisible && effectiveViewModeRef.current !== "density";

      setClustersActive(clustersVisible);
      syncClusterVisibility(map, clustersVisible);
      syncNodeVisibility(map, nodeFallbackVisible);
      setSyncState(sync);
      setCamera({
        longitude: sync.longitude,
        latitude: sync.latitude,
        zoom: sync.zoom,
        pitch: sync.pitch,
        bearing: sync.bearing,
      });
    };

    // Layout changes after mount (panels, fonts, animations) can leave MapLibre with a stale canvas size.
    const forceResize = () => {
      const container = map.getContainer();
      const canvas = map.getCanvas();
      const widthMismatch = Math.abs(container.clientWidth - canvas.clientWidth) > 1;
      const heightMismatch = Math.abs(container.clientHeight - canvas.clientHeight) > 1;

      if (widthMismatch || heightMismatch) {
        map.resize();
      }

      syncCameraState();
    };

    const resizeObserver = new ResizeObserver(() => {
      forceResize();
    });
    resizeObserver.observe(map.getContainer());

    const delayedResizeIds: number[] = [];
    const scheduleResize = (delay: number) => {
      const timeoutId = window.setTimeout(() => {
        forceResize();
      }, delay);
      delayedResizeIds.push(timeoutId);
    };

    const readyTimeout = window.setTimeout(() => {
      if (idleResolved) return;
      const state = useMapStore.getState();
      setMapStatus(state.renderHealth.maplibre ? getOperationalStatus(state.renderHealth) : "failed");
    }, MAP_READY_TIMEOUT_MS);

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setRendererHealth("maplibre", false);
      setMapStatus("failed");
    };

    const handleContextRestored = () => {
      setRendererHealth("maplibre", true);
      setMapStatus("loading");
      syncCameraState();
    };

    const mapCanvas = map.getCanvas();
    mapCanvas.addEventListener("webglcontextlost", handleContextLost, false);
    mapCanvas.addEventListener("webglcontextrestored", handleContextRestored, false);

    map.on("load", () => {
      try {
        installPeruBoundaryLayers(map);
        installDepartmentLayers(map);
        installClusterLayers(map, nodeFeaturesRef.current as unknown as FeatureCollection);
        installNodeFallbackLayers(map, nodeFeaturesRef.current as unknown as FeatureCollection);
        setRendererHealth("maplibre", true);
      } catch (error) {
        console.error("No se pudieron instalar las capas base del mapa.", error);
        setRendererHealth("maplibre", true);
        setMapStatus("degraded");
      }

      syncCameraState();

      // Extra passes to ensure full-height render in responsive/grid layouts.
      scheduleResize(0);
      scheduleResize(160);
      scheduleResize(420);
      scheduleResize(900);

      map.on("mousemove", DEPARTMENT_FILL_LAYER_ID, (event) => {
        const departmentId = getDepartmentIdFromFeature(event.features?.[0] as GeoJSON.Feature | undefined);
        if (!departmentId) return;

        setHoveredDepartment(departmentId);
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", DEPARTMENT_FILL_LAYER_ID, () => {
        setHoveredDepartment(null);
        map.getCanvas().style.cursor = "grab";
      });

      map.on("click", DEPARTMENT_FILL_LAYER_ID, (event) => {
        const activeNodeLayers = [NODE_CIRCLE_LAYER_ID, UNCLUSTERED_LAYER_ID, CLUSTER_LAYER_ID].filter(
          (layerId) => Boolean(map.getLayer(layerId)),
        );
        const hasNodeOnPointer =
          activeNodeLayers.length > 0 &&
          map.queryRenderedFeatures(event.point, { layers: activeNodeLayers }).length > 0;
        if (hasNodeOnPointer) return;

        const departmentId = getDepartmentIdFromFeature(event.features?.[0] as GeoJSON.Feature | undefined);
        if (!departmentId) return;

        useMapStore.getState().pausePresentation();
        const nextDepartment = selectedDepartmentRef.current === departmentId ? null : departmentId;
        onSelectDepartmentRef.current(nextDepartment);
      });
    });

    map.on("styledata", () => {
      setRendererHealth("maplibre", true);
    });

    map.on("idle", () => {
      idleResolved = true;
      window.clearTimeout(readyTimeout);
      syncCameraState();
      const state = useMapStore.getState();
      setMapStatus(getOperationalStatus(state.renderHealth));
    });

    map.on("error", (event) => {
      console.error("MapLibre reporto un error durante el render.", event.error ?? event);
      const state = useMapStore.getState();
      if (state.mapStatus === "loading") {
        setMapStatus(state.renderHealth.maplibre ? "degraded" : "failed");
      }
    });

    map.on("move", syncCameraState);
    map.on("resize", syncCameraState);
    map.on("dragstart", () => {
      useMapStore.getState().pausePresentation();
      map.getCanvas().style.cursor = "grabbing";
    });
    map.on("dragend", () => {
      map.getCanvas().style.cursor = "grab";
    });
    map.on("mousemove", (event) => {
      const picked = pickNodeAtPoint(event.point.x, event.point.y);
      if (!picked) {
        clearHoveredState(map);
        return;
      }
      applyPickedNode(picked, map);
    });
    map.on("mouseleave", () => {
      clearHoveredState(map);
    });
    map.on("mouseenter", NODE_CIRCLE_LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", NODE_CIRCLE_LAYER_ID, () => {
      clearHoveredState(map);
    });
    map.on("mousemove", NODE_CIRCLE_LAYER_ID, (event) => {
      const feature = event.features?.[0];
      const nodeId = feature?.properties?.id;
      if (typeof nodeId !== "string") return;
      const node = nodeMapRef.current.get(nodeId);
      if (!node) return;

      setHoveredNode(nodeId);
      setTooltip({
        nodeId,
        x: event.point.x,
        y: event.point.y,
      });
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("click", CLUSTER_LAYER_ID, (event) => {
      const feature = event.features?.[0] as ClusterFeature | undefined;
      if (!feature) return;
      const clusterId = Number(feature.properties?.cluster_id);
      const source = map.getSource(CLUSTER_SOURCE_ID) as maplibregl.GeoJSONSource & {
        getClusterExpansionZoom: (
          clusterId: number,
          callback: (error: Error | null, zoom: number) => void,
        ) => void;
      };

      if (Number.isNaN(clusterId) || !source.getClusterExpansionZoom) return;

      source.getClusterExpansionZoom(clusterId, (_error, zoom) => {
        const coordinates = feature.geometry.coordinates;
        map.easeTo({
          center: coordinates as [number, number],
          zoom: zoom + 0.25,
          duration: 900,
          essential: true,
        });
      });
    });

    map.on("click", UNCLUSTERED_LAYER_ID, (event) => {
      const feature = event.features?.[0];
      const nodeId = feature?.properties?.id;
      if (typeof nodeId !== "string") return;
      const node = nodeMapRef.current.get(nodeId);
      if (!node) return;

      useMapStore.getState().rememberCameraBeforeNodeFocus(useMapStore.getState().camera);
      useMapStore.getState().selectNode(nodeId, "user");
      const focus = getNodeFocusCamera(node, effectiveViewModeRef.current);
      map.easeTo({
        center: [node.lon, node.lat],
        zoom: focus.zoom ?? 6.6,
        pitch: focus.pitch ?? 32,
        bearing: focus.bearing ?? 0,
        duration: 1600,
        padding: getSuggestedPadding(isDesktopRef.current),
        essential: true,
      });
    });

    map.on("click", NODE_CIRCLE_LAYER_ID, (event) => {
      const feature = event.features?.[0];
      const nodeId = feature?.properties?.id;
      if (typeof nodeId !== "string") return;
      const node = nodeMapRef.current.get(nodeId);
      if (!node) return;

      useMapStore.getState().rememberCameraBeforeNodeFocus(useMapStore.getState().camera);
      useMapStore.getState().selectNode(nodeId, "user");
      const focus = getNodeFocusCamera(node, effectiveViewModeRef.current);
      map.easeTo({
        center: [node.lon, node.lat],
        zoom: focus.zoom ?? 6.6,
        pitch: focus.pitch ?? 32,
        bearing: focus.bearing ?? 0,
        duration: 1450,
        padding: getSuggestedPadding(isDesktopRef.current),
        essential: true,
      });
    });

    map.on("click", (event) => {
      const picked = pickNodeAtPoint(event.point.x, event.point.y);
      if (!picked?.object) return;
      useMapStore.getState().rememberCameraBeforeNodeFocus(useMapStore.getState().camera);
      useMapStore.getState().selectNode(picked.object.id, "user");
    });

    map.on("dblclick", (event) => {
      const picked = pickNodeAtPoint(event.point.x, event.point.y);
      if (!picked?.object) return;

      event.preventDefault();
      const focus = getNodeFocusCamera(picked.object, effectiveViewModeRef.current);
      useMapStore.getState().rememberCameraBeforeNodeFocus(useMapStore.getState().camera);
      useMapStore.getState().requestCameraCommand(
        {
          kind: "focus",
          nodeId: picked.object.id,
          zoom: Math.max(7, focus.zoom ?? 7),
          pitch: focus.pitch,
          bearing: focus.bearing,
          duration: 1700,
          padding: getSuggestedPadding(isDesktopRef.current),
        },
        "user",
      );
    });

    return () => {
      window.clearTimeout(readyTimeout);
      for (const timeoutId of delayedResizeIds) {
        window.clearTimeout(timeoutId);
      }
      resizeObserver.disconnect();
      mapCanvas.removeEventListener("webglcontextlost", handleContextLost, false);
      mapCanvas.removeEventListener("webglcontextrestored", handleContextRestored, false);
      map.remove();
      mapRef.current = null;
      deckRef.current = null;
    };
  }, [
    applyPickedNode,
    clearHoveredState,
    pickNodeAtPoint,
    resetRenderPipeline,
    retryNonce,
    setCamera,
    setHoveredDepartment,
    setHoveredNode,
    setMapStatus,
    setRendererHealth,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(CLUSTER_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    const nodeSource = map.getSource(NODE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    source.setData(nodeFeatures as unknown as FeatureCollection);
    nodeSource?.setData(nodeFeatures as unknown as FeatureCollection);
    const clustersVisible = map.getZoom() < CLUSTER_THRESHOLD && effectiveViewModeRef.current !== "density";
    syncClusterVisibility(map, clustersVisible);
    syncNodeVisibility(map, !clustersVisible && effectiveViewModeRef.current !== "density");
  }, [nodeFeatures]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource(DEPARTMENT_SOURCE_ID)) return;

    for (const feature of departmentRegions.features) {
      const departmentId = feature.properties.id;
      map.setFeatureState(
        {
          source: DEPARTMENT_SOURCE_ID,
          id: departmentId,
        },
        {
          selected: departmentId === focusedDepartment,
          hover: departmentId === hoveredDepartment && departmentId !== focusedDepartment,
        },
      );
    }
  }, [focusedDepartment, hoveredDepartment, mapStatus, retryNonce]);

  useEffect(() => {
    if (mapStatus === "loading") return;

    const nextStatus = getOperationalStatus(renderHealth);
    if (nextStatus !== mapStatus) {
      setMapStatus(nextStatus);
    }
  }, [mapStatus, renderHealth, setMapStatus]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const modePreset = getModeCameraPreset(effectiveViewMode);
    const pitchDelta = Math.abs(map.getPitch() - modePreset.pitch);
    const bearingDelta = Math.abs(map.getBearing() - modePreset.bearing);

    if (pitchDelta > 0.8 || bearingDelta > 0.8) {
      map.easeTo({
        pitch: modePreset.pitch,
        bearing: modePreset.bearing,
        duration: 1150,
        easing: (value) => 1 - Math.pow(1 - value, 3),
        essential: true,
      });
    }
  }, [effectiveViewMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !cameraCommand) return;

    if (cameraCommand.kind === "reset") {
      const modePreset = getModeCameraPreset(effectiveViewMode);
      map.easeTo({
        center: [INITIAL_CAMERA_STATE.longitude, INITIAL_CAMERA_STATE.latitude],
        zoom: INITIAL_CAMERA_STATE.zoom,
        pitch: modePreset.pitch,
        bearing: modePreset.bearing,
        duration: cameraCommand.duration ?? 1600,
        padding: {
          ...getSuggestedPadding(isDesktop),
          ...cameraCommand.padding,
        },
        essential: true,
      });
      return;
    }

    if (cameraCommand.kind === "fitBounds" && cameraCommand.bounds) {
      map.fitBounds(
        [
          [cameraCommand.bounds[0], cameraCommand.bounds[1]],
          [cameraCommand.bounds[2], cameraCommand.bounds[3]],
        ],
        {
          duration: cameraCommand.duration ?? 1600,
          padding: {
            ...getSuggestedPadding(isDesktop),
            ...cameraCommand.padding,
          },
          maxZoom: cameraCommand.maxZoom,
          pitch: cameraCommand.pitch,
          bearing: cameraCommand.bearing,
          essential: true,
        },
      );
      return;
    }

    const targetNode = cameraCommand.nodeId ? nodeMap.get(cameraCommand.nodeId) : undefined;
    const focus = targetNode ? getNodeFocusCamera(targetNode, effectiveViewMode) : undefined;
    const hasCommandCenter =
      typeof cameraCommand.longitude === "number" && typeof cameraCommand.latitude === "number";
    const targetCenter: [number, number] = targetNode
      ? [targetNode.lon, targetNode.lat]
      : hasCommandCenter
        ? [cameraCommand.longitude as number, cameraCommand.latitude as number]
        : [map.getCenter().lng, map.getCenter().lat];

    map.flyTo({
      center: targetCenter,
      zoom: cameraCommand.zoom ?? focus?.zoom ?? map.getZoom(),
      pitch: cameraCommand.pitch ?? focus?.pitch ?? map.getPitch(),
      bearing: cameraCommand.bearing ?? focus?.bearing ?? map.getBearing(),
      duration: cameraCommand.duration ?? 2200,
      padding: {
        ...getSuggestedPadding(isDesktop),
        ...cameraCommand.padding,
      },
      essential: true,
    });
  }, [cameraCommand, cameraCommand?.nonce, effectiveViewMode, isDesktop, nodeMap]);

  const handleDeckReady = useCallback((deck: Deck<MapView[]> | null) => {
    deckRef.current = deck;
  }, []);

  const handleDeckHealthChange = useCallback(
    (healthy: boolean) => {
      setRendererHealth("deck", healthy);

      const state = useMapStore.getState();
      const nextHealth = {
        ...state.renderHealth,
        deck: healthy,
      };

      if (state.mapStatus !== "loading") {
        setMapStatus(getOperationalStatus(nextHealth));
      }
    },
    [setMapStatus, setRendererHealth],
  );

  const handleRetry = useCallback(() => {
    resetRenderPipeline();
    clearHoveredState(mapRef.current);
    setRetryNonce((value) => value + 1);
  }, [clearHoveredState, resetRenderPipeline]);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn({ duration: 500 });
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut({ duration: 500 });
  }, []);

  const handleResetView = useCallback(() => {
    const modePreset = getModeCameraPreset(effectiveViewModeRef.current);
    mapRef.current?.easeTo({
      center: [INITIAL_CAMERA_STATE.longitude, INITIAL_CAMERA_STATE.latitude],
      zoom: INITIAL_CAMERA_STATE.zoom,
      pitch: modePreset.pitch,
      bearing: modePreset.bearing,
      duration: 1000,
      essential: true,
    });
  }, []);

  return (
    <div className="relative h-full min-h-0 w-full">
      <div ref={mapContainerRef} className="absolute inset-0" />
      <DeckCanvasOverlay
        syncState={syncState}
        layers={deckLayers}
        onHealthChange={handleDeckHealthChange}
        onReady={handleDeckReady}
      />
      <div className={atmosphereClass} />
      <div className="pointer-events-none absolute left-5 top-5 z-20 max-w-[18rem] rounded-[22px] border border-white/10 bg-[rgba(6,14,24,0.72)] px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div className="font-['Rajdhani'] text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--text-soft)]">
          Base geoespacial
        </div>
        <div className="mt-2 font-['Rajdhani'] text-lg font-semibold uppercase tracking-[0.08em] text-[var(--text-strong)]">
          Peru logistico operativo
        </div>
        <p className="mt-1 text-xs leading-5 text-[var(--text-main)]">
          Silueta nacional, nodos georreferenciados y controles de navegacion visibles aun si las capas avanzadas se degradan.
        </p>
      </div>
      {effectiveViewMode === "emphasis3d" ? (
        <div className="pointer-events-none absolute left-5 top-36 z-20 max-w-[20rem] rounded-[20px] border border-[rgba(159,186,208,0.28)] bg-[rgba(7,16,26,0.78)] px-4 py-3 shadow-[0_14px_28px_rgba(0,0,0,0.28)] backdrop-blur-lg">
          <div className="font-['Rajdhani'] text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[var(--text-soft)]">
            Modo 3D emphasis
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--text-main)]">
            Esta vista prioriza transicion de camara, halo tactico y jerarquia de nodos. El enfasis 3D se interpreta como relieve operacional, no como pines flotantes.
          </p>
        </div>
      ) : null}
      <div className="absolute right-5 top-5 z-20 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleZoomIn}
          className="control-pill flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-semibold"
          aria-label="Acercar mapa"
        >
          +
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="control-pill flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-semibold"
          aria-label="Alejar mapa"
        >
          -
        </button>
        <button
          type="button"
          onClick={handleResetView}
          className="control-pill min-h-11 rounded-2xl px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
        >
          Peru
        </button>
      </div>
      <RenderStatusOverlay mapStatus={mapStatus} renderHealth={renderHealth} onRetry={handleRetry} />
      <NodeTooltip node={hoveredNode} tooltip={tooltip} />
    </div>
  );
}
