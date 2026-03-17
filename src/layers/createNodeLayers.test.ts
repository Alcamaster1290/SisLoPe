import { describe, expect, it } from "vitest";
import { getNodeModeProfile, shouldDisplayLabelByZoom } from "@/layers/createNodeLayers";
import type { LogisticsNode } from "@/types/logistics";

const baseNode: LogisticsNode = {
  id: "test-port",
  name: "Puerto de prueba",
  category: "port_sea",
  region: "Lima",
  lat: -12.05,
  lon: -77.04,
  strategicLevel: "national",
  macrozone: "center",
  terrain: "coast",
  description: "Nodo de prueba",
  tags: ["test"],
};

describe("label zoom policy", () => {
  it("hides all labels below zoom 6", () => {
    expect(shouldDisplayLabelByZoom(baseNode, 5.9, "lima", null, null)).toBe(false);
  });

  it("shows only ports/focus between zoom 6 and 6.8", () => {
    const airportNode: LogisticsNode = { ...baseNode, id: "air", category: "airport" };
    expect(shouldDisplayLabelByZoom(baseNode, 6.2, "lima", null, null)).toBe(true);
    expect(shouldDisplayLabelByZoom(airportNode, 6.2, "lima", null, null)).toBe(false);
    expect(shouldDisplayLabelByZoom(airportNode, 6.2, "lima", null, "air")).toBe(true);
  });

  it("enables full labels at zoom >= 7.6", () => {
    const airportNode: LogisticsNode = { ...baseNode, id: "air", category: "airport" };
    expect(shouldDisplayLabelByZoom(airportNode, 7.6, null, null, null)).toBe(true);
  });

  it("applies distinct visual profiles by map mode", () => {
    const standard = getNodeModeProfile("standard", 6.8);
    const emphasis = getNodeModeProfile("emphasis3d", 6.8);
    const flows = getNodeModeProfile("flows", 6.8);
    const density = getNodeModeProfile("density", 6.8);
    const densityHighZoom = getNodeModeProfile("density", 8.2);

    expect(emphasis.haloAlpha).toBeGreaterThan(standard.haloAlpha);
    expect(flows.nodeAlpha).toBeLessThan(standard.nodeAlpha);
    expect(density.densityElevationScale).toBeGreaterThan(standard.densityElevationScale);
    expect(densityHighZoom.densityRadius).toBeLessThan(standard.densityRadius);
  });
});
