import type { MapRenderSyncState } from "@/types/logistics";

export const EXPANSION_RESYNC_DELAYS_MS = [0, 120, 320, 700] as const;

export interface MapLike {
  getCenter: () => { lng: number; lat: number };
  getZoom: () => number;
  getPitch: () => number;
  getBearing: () => number;
  getContainer: () => HTMLElement;
  getCanvas: () => HTMLCanvasElement;
  resize: () => void;
}

export function buildMapRenderSyncState(map: MapLike): MapRenderSyncState {
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

export function resizeMapIfNeeded(map: MapLike): void {
  const container = map.getContainer();
  const canvas = map.getCanvas();
  const widthMismatch = Math.abs(container.clientWidth - canvas.clientWidth) > 1;
  const heightMismatch = Math.abs(container.clientHeight - canvas.clientHeight) > 1;

  if (widthMismatch || heightMismatch) {
    map.resize();
  }
}

interface ScheduleMapLayoutResyncOptions {
  map: MapLike;
  onSync: (syncState: MapRenderSyncState) => void;
  delays?: readonly number[];
}

export function scheduleMapLayoutResync({
  map,
  onSync,
  delays = EXPANSION_RESYNC_DELAYS_MS,
}: ScheduleMapLayoutResyncOptions): () => void {
  let rafId = 0;
  const timeoutIds: number[] = [];
  let cancelled = false;

  const sync = () => {
    if (cancelled) return;
    resizeMapIfNeeded(map);
    onSync(buildMapRenderSyncState(map));
  };

  const scheduleTick = (delay: number) => {
    const timeoutId = window.setTimeout(() => {
      rafId = window.requestAnimationFrame(sync);
    }, delay);
    timeoutIds.push(timeoutId);
  };

  scheduleTick(0);
  delays.forEach((delay) => {
    if (delay > 0) {
      scheduleTick(delay);
    }
  });

  return () => {
    cancelled = true;
    if (rafId) {
      window.cancelAnimationFrame(rafId);
    }
    timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
  };
}
