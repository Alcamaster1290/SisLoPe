import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MapLegend } from "@/components/map/MapLegend";
import type { LogisticsNode, NodeCategory } from "@/types/logistics";

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

const baseTotals = {
  port_sea: 1,
  port_river: 0,
  airport: 0,
  border: 0,
  freezone: 0,
  inland_hub: 0,
  corridor_anchor: 0,
  aduana: 0,
} satisfies Record<NodeCategory, number>;

describe("MapLegend", () => {
  it("usa _ para minimizar y + para expandir de nuevo", () => {
    render(
      <MapLegend
        visibleNodes={[sampleNode]}
        availableCategories={["port_sea"]}
        categoryTotals={baseTotals}
        activeCategories={[]}
        onToggleCategory={() => undefined}
        onSelectAllCategories={() => undefined}
      />,
    );

    const minimizeButton = screen.getByRole("button", { name: /minimizar leyenda/i });
    expect(minimizeButton).toHaveTextContent("_");

    fireEvent.click(minimizeButton);

    const expandButton = screen.getByRole("button", { name: /expandir leyenda/i });
    expect(expandButton).toHaveTextContent("+");
    expect(screen.getByText(/1 nodos visibles/i)).toBeInTheDocument();
  });

  it("ya no expone el boton Limpiar en la cabecera", () => {
    render(
      <MapLegend
        visibleNodes={[sampleNode]}
        availableCategories={["port_sea"]}
        categoryTotals={baseTotals}
        activeCategories={["port_sea"]}
        onToggleCategory={() => undefined}
        onSelectAllCategories={() => undefined}
      />,
    );

    expect(screen.queryByRole("button", { name: /limpiar/i })).toBeNull();
  });

  it("el boton Seleccionar todo dispara onSelectAllCategories solo cuando hay filtro activo", () => {
    const onSelectAll = vi.fn();
    const { rerender } = render(
      <MapLegend
        visibleNodes={[sampleNode]}
        availableCategories={["port_sea", "airport"]}
        categoryTotals={{ ...baseTotals, airport: 2 }}
        activeCategories={[]}
        onToggleCategory={() => undefined}
        onSelectAllCategories={onSelectAll}
      />,
    );

    const button = screen.getByRole("button", { name: /seleccionar todo/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onSelectAll).not.toHaveBeenCalled();

    rerender(
      <MapLegend
        visibleNodes={[sampleNode]}
        availableCategories={["port_sea", "airport"]}
        categoryTotals={{ ...baseTotals, airport: 2 }}
        activeCategories={["port_sea"]}
        onToggleCategory={() => undefined}
        onSelectAllCategories={onSelectAll}
      />,
    );

    const enabledButton = screen.getByRole("button", { name: /seleccionar todo/i });
    expect(enabledButton).not.toBeDisabled();
    fireEvent.click(enabledButton);
    expect(onSelectAll).toHaveBeenCalledTimes(1);
  });
});
