import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NodeTooltip } from "@/components/map/NodeTooltip";
import type { LogisticsNode } from "@/types/logistics";

const sampleNode: LogisticsNode = {
  id: "moyobamba",
  name: "Moyobamba",
  category: "inland_hub",
  region: "San Martin",
  province: "Moyobamba",
  lat: -6.0342,
  lon: -76.9742,
  strategicLevel: "complementary",
  macrozone: "amazon",
  terrain: "jungle",
  description: "Nodo interior del corredor noramazonico.",
  tags: ["selva"],
};

describe("NodeTooltip", () => {
  it("muestra boton X y permite cerrar el popup", () => {
    const onClose = vi.fn();

    render(
      <NodeTooltip
        node={sampleNode}
        tooltip={{ nodeId: "moyobamba", x: 120, y: 180 }}
        onClose={onClose}
      />,
    );

    const closeButton = screen.getByRole("button", { name: /cerrar popup del nodo/i });
    expect(closeButton).toHaveTextContent("X");

    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
