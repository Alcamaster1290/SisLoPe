import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildMapRenderSyncState,
  resizeMapIfNeeded,
  scheduleMapLayoutResync,
} from "@/components/map/mapLayoutSync";

function createMapStub(overrides?: {
  containerWidth?: number;
  containerHeight?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}) {
  const resize = vi.fn();

  return {
    getCenter: () => ({ lng: -75.35, lat: -9.45 }),
    getZoom: () => 5.4,
    getPitch: () => 24,
    getBearing: () => 0,
    getContainer: () =>
      ({
        clientWidth: overrides?.containerWidth ?? 1280,
        clientHeight: overrides?.containerHeight ?? 720,
      }) as HTMLDivElement,
    getCanvas: () =>
      ({
        clientWidth: overrides?.canvasWidth ?? 1200,
        clientHeight: overrides?.canvasHeight ?? 680,
      }) as HTMLCanvasElement,
    resize,
  };
}

describe("mapLayoutSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(16);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("recalcula syncState con dimensiones validas", () => {
    const map = createMapStub({ containerWidth: 1400, containerHeight: 860, canvasWidth: 1400, canvasHeight: 860 });

    expect(buildMapRenderSyncState(map).width).toBe(1400);
    expect(buildMapRenderSyncState(map).height).toBe(860);
  });

  it("redimensiona el mapa cuando el canvas queda desfasado", () => {
    const map = createMapStub({ containerWidth: 1440, containerHeight: 900, canvasWidth: 1180, canvasHeight: 700 });

    resizeMapIfNeeded(map);

    expect(map.resize).toHaveBeenCalledTimes(1);
  });

  it("agenda resincronizacion diferida al cambiar el layout", () => {
    const map = createMapStub();
    const onSync = vi.fn();

    const cleanup = scheduleMapLayoutResync({ map, onSync, delays: [0, 120, 320] });

    vi.runAllTimers();

    expect(onSync).toHaveBeenCalledTimes(3);
    expect(onSync).toHaveBeenLastCalledWith(
      expect.objectContaining({
        width: 1280,
        height: 720,
      }),
    );

    cleanup();
  });
});
