import { describe, expect, it } from "vitest";
import { projectTooltipFromNode } from "@/components/map/mapTooltipPosition";
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

describe("projectTooltipFromNode", () => {
  it("ancla el popup a la proyeccion actual del nodo", () => {
    const tooltip = projectTooltipFromNode(
      {
        project: ([lon, lat]) => ({
          x: lon * -10,
          y: lat * -10,
        }),
      },
      sampleNode,
    );

    expect(tooltip).toEqual({
      nodeId: "moyobamba",
      x: 769.742,
      y: 60.342,
    });
  });
});
