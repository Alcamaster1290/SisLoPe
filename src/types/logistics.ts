import type { Feature, FeatureCollection, LineString, Point } from "geojson";

export type NodeCategory =
  | "port_sea"
  | "port_river"
  | "airport"
  | "border"
  | "freezone"
  | "inland_hub"
  | "corridor_anchor";

export type StrategicLevel = "national" | "regional" | "complementary";
export type Macrozone = "north" | "center" | "south" | "amazon" | "border";
export type Terrain = "coast" | "highlands" | "jungle" | "lake";
export type DepartmentId =
  | "amazonas"
  | "ancash"
  | "apurimac"
  | "arequipa"
  | "ayacucho"
  | "cajamarca"
  | "cusco"
  | "huancavelica"
  | "huanuco"
  | "ica"
  | "junin"
  | "la_libertad"
  | "lambayeque"
  | "lima"
  | "loreto"
  | "madre_de_dios"
  | "moquegua"
  | "pasco"
  | "piura"
  | "puno"
  | "san_martin"
  | "tacna"
  | "tumbes"
  | "ucayali";
export type FlowMode = "land" | "sea" | "river";
export type FlowImportance = "primary" | "secondary";
export type MapViewMode = "standard" | "emphasis3d" | "flows" | "density";
export type MapThemeDepth = "dark" | "deep-dark";
export type ActionOrigin = "user" | "presentation" | "system";
export type MapStatus = "loading" | "ready" | "degraded" | "failed";
export type RenderSubsystem = "maplibre" | "deck" | "three";

export interface LogisticsNode {
  id: string;
  name: string;
  category: NodeCategory;
  region: string;
  province?: string;
  district?: string;
  lat: number;
  lon: number;
  strategicLevel: StrategicLevel;
  macrozone: Macrozone;
  terrain?: Terrain;
  code?: string;
  description: string;
  tags: string[];
  connections?: string[];
  isApprox?: boolean;
}

export interface LogisticsFlow {
  id: string;
  from: string;
  to: string;
  mode: FlowMode;
  importance: FlowImportance;
  label?: string;
  animated: boolean;
  bidirectional?: boolean;
}

export interface NodeFilters {
  categories: NodeCategory[];
  macrozones: Macrozone[];
  strategicLevels: StrategicLevel[];
  terrains: Terrain[];
  department: DepartmentId | null;
  search: string;
}

export interface MapCameraState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface MapRenderSyncState extends MapCameraState {
  width: number;
  height: number;
}

export interface RenderHealth {
  maplibre: boolean;
  deck: boolean;
  three: boolean;
}

export interface CameraPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CameraCommand {
  kind: "focus" | "reset" | "fitBounds";
  nodeId?: string;
  longitude?: number;
  latitude?: number;
  bounds?: [number, number, number, number];
  zoom?: number;
  maxZoom?: number;
  pitch?: number;
  bearing?: number;
  duration?: number;
  padding?: Partial<CameraPadding>;
  nonce: number;
}

export interface PresentationState {
  active: boolean;
  paused: boolean;
  currentIndex: number;
  sequence: string[];
}

export interface CoordinateOverride {
  lat: number;
  lon: number;
  source: string;
}

export interface NodeFeatureProperties extends LogisticsNode {
  kind: "node";
}

export interface FlowFeatureProperties extends LogisticsFlow {
  kind: "flow";
  distanceKm: number;
  sourceNode: LogisticsNode;
  targetNode: LogisticsNode;
  timestamps: number[];
}

export type NodeFeature = Feature<Point, NodeFeatureProperties>;
export type NodeFeatureCollection = FeatureCollection<Point, NodeFeatureProperties>;
export type FlowFeature = Feature<LineString, FlowFeatureProperties>;
export type FlowFeatureCollection = FeatureCollection<LineString, FlowFeatureProperties>;

export interface TooltipState {
  nodeId: string;
  x: number;
  y: number;
}

export interface NodeLabelDatum {
  node: LogisticsNode;
  labelPosition: [number, number];
  fluxPath: [number, number][];
  priority: number;
  side: "left" | "right";
}
