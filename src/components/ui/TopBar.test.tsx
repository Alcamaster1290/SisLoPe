import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TopBar } from "@/components/ui/TopBar";

const noop = () => undefined;

describe("TopBar", () => {
  it("ya no renderiza el boton textual de expandir mapa", () => {
    render(
      <TopBar
        visibleNodeCount={24}
        visibleFlowCount={12}
        viewMode="standard"
        themeDepth="dark"
        showLabels={true}
        showFlows={true}
        showCorridors={true}
        exportPending={false}
        presentation={{ active: false, paused: false, currentIndex: 0, sequence: [] }}
        onViewModeChange={noop}
        onToggleThemeDepth={noop}
        onToggleLabels={noop}
        onToggleFlows={noop}
        onToggleCorridors={noop}
        onResetCamera={noop}
        onExport={noop}
        onStartPresentation={noop}
        onPausePresentation={noop}
        onResumePresentation={noop}
        onStopPresentation={noop}
      />,
    );

    expect(screen.queryByRole("button", { name: /expandir mapa/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /restaurar panel/i })).not.toBeInTheDocument();
  });
});
