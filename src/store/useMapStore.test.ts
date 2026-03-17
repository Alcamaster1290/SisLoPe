import { beforeEach, describe, expect, it } from "vitest";
import { createInitialMapState, useMapStore } from "@/store/useMapStore";

describe("useMapStore", () => {
  beforeEach(() => {
    useMapStore.setState(createInitialMapState());
  });

  it("starts presentation mode with visual toggles enabled", () => {
    useMapStore.getState().startPresentation();

    const state = useMapStore.getState();
    expect(state.presentation.active).toBe(true);
    expect(state.presentation.paused).toBe(false);
    expect(state.viewMode).toBe("flows");
    expect(state.showFlows).toBe(true);
    expect(state.showCorridors).toBe(true);
  });

  it("pauses presentation on manual filter changes", () => {
    const store = useMapStore.getState();
    store.startPresentation();
    store.toggleCategory("port_sea");

    expect(useMapStore.getState().presentation.paused).toBe(true);
    expect(useMapStore.getState().filters.categories).toContain("port_sea");
  });

  it("clears only category filters without touching department selection", () => {
    const store = useMapStore.getState();
    store.toggleCategory("port_sea");
    store.toggleCategory("airport");
    store.setDepartment("lima");

    store.clearCategoryFilters();

    expect(useMapStore.getState().filters.categories).toEqual([]);
    expect(useMapStore.getState().selectedDepartment).toBe("lima");
    expect(useMapStore.getState().filters.department).toBe("lima");
  });

  it("supports setting explicit category lists", () => {
    const store = useMapStore.getState();
    store.setCategoryFilters(["port_sea", "airport"]);

    expect(useMapStore.getState().filters.categories).toEqual(["port_sea", "airport"]);
  });

  it("creates camera commands with nonce", () => {
    useMapStore.getState().requestCameraCommand({ kind: "reset", duration: 900 });

    const command = useMapStore.getState().cameraCommand;
    expect(command?.kind).toBe("reset");
    expect(typeof command?.nonce).toBe("number");
  });

  it("starts with loading render state", () => {
    const state = useMapStore.getState();

    expect(state.mapStatus).toBe("loading");
    expect(state.renderHealth).toEqual({
      maplibre: false,
      deck: false,
      three: false,
    });
  });

  it("updates renderer health and resets the pipeline", () => {
    const store = useMapStore.getState();

    store.setRendererHealth("maplibre", true);
    store.setRendererHealth("deck", true);
    store.setRendererHealth("three", true);
    store.setMapStatus("ready");

    expect(useMapStore.getState().renderHealth).toEqual({
      maplibre: true,
      deck: true,
      three: true,
    });
    expect(useMapStore.getState().mapStatus).toBe("ready");

    store.resetRenderPipeline();

    expect(useMapStore.getState().mapStatus).toBe("loading");
    expect(useMapStore.getState().renderHealth).toEqual({
      maplibre: false,
      deck: false,
      three: false,
    });
  });

  it("keeps selected and hovered department state in sync", () => {
    const store = useMapStore.getState();
    store.setDepartment("lima");
    store.setHoveredDepartment("lima");

    expect(useMapStore.getState().selectedDepartment).toBe("lima");
    expect(useMapStore.getState().hoveredDepartment).toBe("lima");

    store.setDepartment("arequipa");
    expect(useMapStore.getState().hoveredDepartment).toBe("lima");

    store.resetFilters();
    expect(useMapStore.getState().selectedDepartment).toBeNull();
    expect(useMapStore.getState().hoveredDepartment).toBeNull();
  });

  it("stores and clears camera snapshot before node focus", () => {
    const store = useMapStore.getState();
    const snapshot = {
      longitude: -75.35,
      latitude: -9.45,
      zoom: 5.2,
      pitch: 28,
      bearing: 6,
    };

    store.rememberCameraBeforeNodeFocus(snapshot);
    expect(useMapStore.getState().cameraBeforeNodeFocus).toEqual(snapshot);

    store.clearCameraBeforeNodeFocus();
    expect(useMapStore.getState().cameraBeforeNodeFocus).toBeNull();
  });
});
