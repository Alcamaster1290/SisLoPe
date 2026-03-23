import { create } from "zustand";
import type {
  ActionOrigin,
  CameraCommand,
  DepartmentId,
  MapCameraState,
  Macrozone,
  MapStatus,
  MapThemeDepth,
  RenderHealth,
  RenderSubsystem,
  MapViewMode,
  NodeCategory,
  NodeFilters,
  PresentationState,
  StrategicLevel,
  Terrain,
} from "@/types/logistics";
import { INITIAL_CAMERA_STATE, PRESENTATION_SEQUENCE } from "@/utils/geo";

interface MapStoreState {
  filters: NodeFilters;
  selectedDepartment: DepartmentId | null;
  hoveredDepartment: DepartmentId | null;
  viewMode: MapViewMode;
  themeDepth: MapThemeDepth;
  mapStatus: MapStatus;
  renderHealth: RenderHealth;
  showLabels: boolean;
  showFlows: boolean;
  showCorridors: boolean;
  showFleetHeatmap: boolean;
  isMapExpanded: boolean;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  camera: typeof INITIAL_CAMERA_STATE;
  cameraBeforeNodeFocus: MapCameraState | null;
  cameraCommand: CameraCommand | null;
  exportPending: boolean;
  presentation: PresentationState;
  setSearch: (value: string) => void;
  setDepartment: (department: DepartmentId | null) => void;
  setHoveredDepartment: (department: DepartmentId | null) => void;
  toggleCategory: (category: NodeCategory) => void;
  setCategoryFilters: (categories: NodeCategory[]) => void;
  clearCategoryFilters: () => void;
  toggleFilterValue: (
    key: "macrozones" | "strategicLevels" | "terrains",
    value: Macrozone | StrategicLevel | Terrain,
  ) => void;
  resetFilters: () => void;
  setViewMode: (mode: MapViewMode) => void;
  setThemeDepth: (themeDepth: MapThemeDepth) => void;
  toggleLabels: () => void;
  toggleFlows: () => void;
  toggleCorridors: () => void;
  toggleFleetHeatmap: () => void;
  toggleMapExpanded: () => void;
  setHoveredNode: (nodeId: string | null) => void;
  selectNode: (nodeId: string | null, origin?: ActionOrigin) => void;
  rememberCameraBeforeNodeFocus: (camera: MapCameraState) => void;
  clearCameraBeforeNodeFocus: () => void;
  requestCameraCommand: (command: Omit<CameraCommand, "nonce">, origin?: ActionOrigin) => void;
  setCamera: (camera: typeof INITIAL_CAMERA_STATE) => void;
  setMapStatus: (status: MapStatus) => void;
  setRendererHealth: (subsystem: RenderSubsystem, healthy: boolean) => void;
  resetRenderPipeline: () => void;
  setExportPending: (value: boolean) => void;
  startPresentation: () => void;
  pausePresentation: () => void;
  resumePresentation: () => void;
  stopPresentation: () => void;
  advancePresentation: () => void;
}

const initialFilters: NodeFilters = {
  categories: [],
  macrozones: [],
  strategicLevels: [],
  terrains: [],
  department: null,
  search: "",
};

const initialRenderHealth: RenderHealth = {
  maplibre: false,
  deck: false,
  three: true,
};

function pausePresentationOnUserAction(state: MapStoreState): Partial<MapStoreState> {
  if (!state.presentation.active) return {};
  return {
    presentation: {
      ...state.presentation,
      paused: true,
    },
  };
}

export function createInitialMapState(): Pick<
  MapStoreState,
  | "filters"
  | "selectedDepartment"
  | "hoveredDepartment"
  | "viewMode"
  | "themeDepth"
  | "showLabels"
  | "showFlows"
  | "showCorridors"
  | "showFleetHeatmap"
  | "isMapExpanded"
  | "mapStatus"
  | "renderHealth"
  | "hoveredNodeId"
  | "selectedNodeId"
  | "camera"
  | "cameraBeforeNodeFocus"
  | "cameraCommand"
  | "exportPending"
  | "presentation"
> {
  return {
    filters: initialFilters,
    selectedDepartment: null,
    hoveredDepartment: null,
    viewMode: "standard",
    themeDepth: "light",
    mapStatus: "loading",
    renderHealth: { ...initialRenderHealth },
    showLabels: true,
    showFlows: true,
    showCorridors: true,
    showFleetHeatmap: false,
    isMapExpanded: true,
    hoveredNodeId: null,
    selectedNodeId: null,
    camera: INITIAL_CAMERA_STATE,
    cameraBeforeNodeFocus: null,
    cameraCommand: null,
    exportPending: false,
    presentation: {
      active: false,
      paused: false,
      currentIndex: 0,
      sequence: [...PRESENTATION_SEQUENCE],
    },
  };
}

export const useMapStore = create<MapStoreState>((set) => ({
  ...createInitialMapState(),
  setSearch: (value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        search: value,
      },
      ...pausePresentationOnUserAction(state),
    })),
  setDepartment: (department) =>
    set((state) => ({
      selectedDepartment: department,
      hoveredDepartment: state.hoveredDepartment === department ? null : state.hoveredDepartment,
      filters: {
        ...state.filters,
        department,
      },
      ...pausePresentationOnUserAction(state),
    })),
  setHoveredDepartment: (department) =>
    set((state) =>
      state.hoveredDepartment === department
        ? state
        : {
            hoveredDepartment: department,
          },
    ),
  toggleCategory: (category) =>
    set((state) => {
      const categories = state.filters.categories.includes(category)
        ? state.filters.categories.filter((entry) => entry !== category)
        : [...state.filters.categories, category];

      return {
        filters: {
          ...state.filters,
          categories,
        },
        ...pausePresentationOnUserAction(state),
      };
    }),
  setCategoryFilters: (categories) =>
    set((state) => ({
      filters: {
        ...state.filters,
        categories,
      },
      ...pausePresentationOnUserAction(state),
    })),
  clearCategoryFilters: () =>
    set((state) => ({
      filters: {
        ...state.filters,
        categories: [],
      },
      ...pausePresentationOnUserAction(state),
    })),
  toggleFilterValue: (key, value) =>
    set((state) => {
      const current = state.filters[key] as Array<Macrozone | StrategicLevel | Terrain>;
      const next = current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value];

      return {
        filters: {
          ...state.filters,
          [key]: next as NodeFilters[typeof key],
        },
        ...pausePresentationOnUserAction(state),
      };
    }),
  resetFilters: () =>
    set((state) => ({
      filters: initialFilters,
      selectedDepartment: null,
      hoveredDepartment: null,
      cameraBeforeNodeFocus: null,
      ...pausePresentationOnUserAction(state),
    })),
  setViewMode: (mode) =>
    set((state) => ({
      viewMode: mode,
      ...pausePresentationOnUserAction(state),
    })),
  setThemeDepth: (themeDepth) =>
    set((state) => ({
      themeDepth,
      ...pausePresentationOnUserAction(state),
    })),
  toggleLabels: () =>
    set((state) => ({
      showLabels: !state.showLabels,
      ...pausePresentationOnUserAction(state),
    })),
  toggleFlows: () =>
    set((state) => ({
      showFlows: !state.showFlows,
      ...pausePresentationOnUserAction(state),
    })),
  toggleCorridors: () =>
    set((state) => ({
      showCorridors: !state.showCorridors,
      ...pausePresentationOnUserAction(state),
    })),
  toggleFleetHeatmap: () =>
    set((state) => ({
      showFleetHeatmap: !state.showFleetHeatmap,
      ...pausePresentationOnUserAction(state),
    })),
  toggleMapExpanded: () =>
    set((state) => ({
      isMapExpanded: !state.isMapExpanded,
      ...pausePresentationOnUserAction(state),
    })),
  setHoveredNode: (nodeId) =>
    set((state) =>
      state.hoveredNodeId === nodeId
        ? state
        : {
            hoveredNodeId: nodeId,
          },
    ),
  selectNode: (nodeId, origin = "user") =>
    set((state) => ({
      selectedNodeId: nodeId,
      ...(origin === "user" ? pausePresentationOnUserAction(state) : {}),
    })),
  rememberCameraBeforeNodeFocus: (camera) =>
    set(() => ({
      cameraBeforeNodeFocus: camera,
    })),
  clearCameraBeforeNodeFocus: () =>
    set(() => ({
      cameraBeforeNodeFocus: null,
    })),
  requestCameraCommand: (command, origin = "user") =>
    set((state) => ({
      cameraCommand: {
        ...command,
        nonce: Date.now(),
      },
      ...(origin === "user" ? pausePresentationOnUserAction(state) : {}),
    })),
  setCamera: (camera) => set(() => ({ camera })),
  setMapStatus: (status) => set(() => ({ mapStatus: status })),
  setRendererHealth: (subsystem, healthy) =>
    set((state) => ({
      renderHealth: {
        ...state.renderHealth,
        [subsystem]: healthy,
      },
    })),
  resetRenderPipeline: () =>
    set(() => ({
      mapStatus: "loading",
      renderHealth: { ...initialRenderHealth },
    })),
  setExportPending: (value) => set(() => ({ exportPending: value })),
  startPresentation: () =>
    set((state) => ({
      presentation: {
        ...state.presentation,
        active: true,
        paused: false,
        currentIndex: 0,
      },
      filters: {
        ...state.filters,
        department: null,
      },
      selectedDepartment: null,
      hoveredDepartment: null,
      cameraBeforeNodeFocus: null,
      viewMode: "flows",
      showFlows: true,
      showCorridors: true,
      showLabels: true,
      showFleetHeatmap: false,
    })),
  pausePresentation: () =>
    set((state) => ({
      presentation: {
        ...state.presentation,
        paused: true,
      },
    })),
  resumePresentation: () =>
    set((state) => ({
      presentation: {
        ...state.presentation,
        active: true,
        paused: false,
      },
    })),
  stopPresentation: () =>
    set((state) => ({
      presentation: {
        ...state.presentation,
        active: false,
        paused: false,
        currentIndex: 0,
      },
    })),
  advancePresentation: () =>
    set((state) => ({
      presentation: {
        ...state.presentation,
        currentIndex: (state.presentation.currentIndex + 1) % state.presentation.sequence.length,
      },
    })),
}));

