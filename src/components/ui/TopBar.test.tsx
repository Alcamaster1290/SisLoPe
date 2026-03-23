import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TopBar } from "@/components/ui/TopBar";

const noop = () => undefined;

function renderTopBar(
  overrides: Partial<ComponentProps<typeof TopBar>> = {},
) {
  return render(
    <TopBar
      visibleNodeCount={24}
      visibleFlowCount={12}
      viewMode="standard"
      themeDepth="dark"
      showLabels={true}
      showFlows={true}
      showCorridors={true}
      showFleetHeatmap={false}
      showFleetHeatmapControl={false}
      exportPending={false}
      presentation={{ active: false, paused: false, currentIndex: 0, sequence: [] }}
      onViewModeChange={noop}
      onToggleThemeDepth={noop}
      onToggleLabels={noop}
      onToggleFlows={noop}
      onToggleCorridors={noop}
      onToggleFleetHeatmap={noop}
      onResetCamera={noop}
      onExport={noop}
      onStartPresentation={noop}
      onPausePresentation={noop}
      onResumePresentation={noop}
      onStopPresentation={noop}
      {...overrides}
    />,
  );
}

describe("TopBar", () => {
  it("ya no renderiza el boton textual de expandir mapa", () => {
    renderTopBar();

    expect(screen.queryByRole("button", { name: /expandir mapa/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /restaurar panel/i })).not.toBeInTheDocument();
  });

  it("renderiza el toggle de heatmap solo cuando el feature flag esta activo", () => {
    renderTopBar({
      showFleetHeatmap: true,
      showFleetHeatmapControl: true,
    });

    expect(screen.getByRole("button", { name: /heatmap de flota/i })).toBeInTheDocument();
  });

  it("activa el callback del heatmap cuando el boton esta visible", () => {
    const onToggleFleetHeatmap = vi.fn();

    renderTopBar({
      showFleetHeatmapControl: true,
      onToggleFleetHeatmap,
    });

    fireEvent.click(screen.getByRole("button", { name: /heatmap de flota/i }));

    expect(onToggleFleetHeatmap).toHaveBeenCalledTimes(1);
  });
});
