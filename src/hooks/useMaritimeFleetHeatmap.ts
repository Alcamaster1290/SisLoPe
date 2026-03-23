import { useEffect, useState } from "react";
import type {
  MaritimeFleetHeatmapCell,
  MaritimeFleetHeatmapCoverage,
  MaritimeFleetHeatmapSnapshot,
  MaritimeFleetHeatmapStatus,
} from "@/types/maritimeHeatmap";
import type { MaritimeFleetHeatmapReadService } from "@/lib/maritimeHeatmap/service";

interface UseMaritimeFleetHeatmapOptions {
  enabled: boolean;
  service: MaritimeFleetHeatmapReadService;
}

export interface MaritimeFleetHeatmapViewState {
  status: MaritimeFleetHeatmapStatus;
  snapshot: MaritimeFleetHeatmapSnapshot | null;
  coverage: MaritimeFleetHeatmapCoverage | null;
  cells: MaritimeFleetHeatmapCell[];
  errorMessage: string | null;
}

const initialState: MaritimeFleetHeatmapViewState = {
  status: "idle",
  snapshot: null,
  coverage: null,
  cells: [],
  errorMessage: null,
};

export function useMaritimeFleetHeatmap({
  enabled,
  service,
}: UseMaritimeFleetHeatmapOptions): MaritimeFleetHeatmapViewState {
  const [state, setState] = useState<MaritimeFleetHeatmapViewState>(initialState);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    void (async () => {
      try {
        const [daily, coverage] = await Promise.all([
          service.getDailySnapshot({ signal: controller.signal }),
          service.getCoverage({ signal: controller.signal }),
        ]);

        if (cancelled) {
          return;
        }

        setState({
          status: daily.status === "ready" ? "ready" : "empty",
          snapshot: daily.snapshot,
          coverage: coverage.coverage,
          cells: daily.cells,
          errorMessage: null,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState({
          status: "error",
          snapshot: null,
          coverage: null,
          cells: [],
          errorMessage: error instanceof Error ? error.message : "No se pudo cargar el heatmap diario.",
        });
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, service]);

  if (!enabled) {
    return initialState;
  }

  if (state.status === "idle") {
    return {
      ...state,
      status: "loading",
    };
  }

  return state;
}
