import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MapLegend } from "@/components/map/MapLegend";
import type { LogisticsNode } from "@/types/logistics";

const sampleNode: LogisticsNode = {
  id: "callao",
  name: "Puerto del Callao",
  category: "port_sea",
  region: "Lima",
  lat: -12.056,
  lon: -77.148,
  strategicLevel: "national",
  macrozone: "center",
  terrain: "coast",
  description: "Nodo maritimo principal",
  tags: ["puerto"],
};

describe("MapLegend", () => {
  it("usa _ para minimizar y + para expandir de nuevo", () => {
    render(
      <MapLegend
        visibleNodes={[sampleNode]}
        availableCategories={["port_sea"]}
        categoryTotals={{
          port_sea: 1,
          port_river: 0,
          airport: 0,
          border: 0,
          freezone: 0,
          inland_hub: 0,
          corridor_anchor: 0,
        }}
        activeCategories={[]}
        onToggleCategory={() => undefined}
        onClearCategories={() => undefined}
      />,
    );

    const minimizeButton = screen.getByRole("button", { name: /minimizar leyenda/i });
    expect(minimizeButton).toHaveTextContent("_");

    fireEvent.click(minimizeButton);

    const expandButton = screen.getByRole("button", { name: /expandir leyenda/i });
    expect(expandButton).toHaveTextContent("+");
    expect(screen.getByText(/1 nodos visibles/i)).toBeInTheDocument();
  });
});
