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

/** Expand the secondary controls row so analytical buttons are visible. */
function expandAdvancedControls() {
  fireEvent.click(screen.getByRole("button", { name: /mas controles/i }));
}

describe("TopBar", () => {
  it("ya no renderiza el boton textual de expandir mapa", () => {
    renderTopBar();

    expect(screen.queryByRole("button", { name: /expandir mapa/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /restaurar panel/i })).not.toBeInTheDocument();
  });

  it("renderiza controles primarios sin necesidad de expandir", () => {
    renderTopBar();

    expect(screen.getByRole("button", { name: /2D/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /modo claro/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reiniciar camara/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mas controles/i })).toBeInTheDocument();
  });

  it("oculta controles analiticos por defecto y los muestra al expandir", () => {
    renderTopBar();

    // Analytical controls hidden by default
    expect(screen.queryByRole("button", { name: /etiquetas/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /corredores/i })).not.toBeInTheDocument();

    // Expand
    expandAdvancedControls();

    // Now visible
    expect(screen.getByRole("button", { name: /etiquetas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /corredores/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /exportar png/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /modo presentacion/i })).toBeInTheDocument();
  });

  it("renderiza el toggle de heatmap solo cuando el feature flag esta activo", () => {
    renderTopBar({
      showFleetHeatmap: true,
      showFleetHeatmapControl: true,
    });

    // Need to expand advanced controls to see heatmap
    expandAdvancedControls();

    expect(screen.getByRole("button", { name: /heatmap de flota/i })).toBeInTheDocument();
  });

  it("activa el callback del heatmap cuando el boton esta visible", () => {
    const onToggleFleetHeatmap = vi.fn();

    renderTopBar({
      showFleetHeatmapControl: true,
      onToggleFleetHeatmap,
    });

    expandAdvancedControls();

    fireEvent.click(screen.getByRole("button", { name: /heatmap de flota/i }));

    expect(onToggleFleetHeatmap).toHaveBeenCalledTimes(1);
  });

  it("colapsa los controles avanzados al hacer clic en 'Menos controles'", () => {
    renderTopBar();

    expandAdvancedControls();
    expect(screen.getByRole("button", { name: /etiquetas/i })).toBeInTheDocument();

    // Collapse
    fireEvent.click(screen.getByRole("button", { name: /menos controles/i }));
    expect(screen.queryByRole("button", { name: /etiquetas/i })).not.toBeInTheDocument();
  });
});
