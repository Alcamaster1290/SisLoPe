import { describe, expect, it } from "vitest";
import type { LogisticsFlow, LogisticsNode } from "@/types/logistics";
import { flowsToFeatureCollection, getDepartmentViewPreset, nodesToFeatureCollection } from "@/utils/geo";

const sampleNodes: LogisticsNode[] = [
  {
    id: "callao",
    name: "Callao",
    category: "port_sea",
    region: "Callao",
    lat: -12.05,
    lon: -77.14,
    strategicLevel: "national",
    macrozone: "center",
    terrain: "coast",
    description: "Nodo portuario principal",
    tags: ["mar"],
  },
  {
    id: "lurin",
    name: "Lurín",
    category: "inland_hub",
    region: "Lima",
    lat: -12.2747,
    lon: -76.8697,
    strategicLevel: "national",
    macrozone: "center",
    terrain: "coast",
    description: "Hub metropolitano",
    tags: ["hub"],
  },
];

const sampleFlows: LogisticsFlow[] = [
  {
    id: "callao-lurin",
    from: "callao",
    to: "lurin",
    mode: "land",
    importance: "primary",
    animated: true,
  },
];

describe("geo utilities", () => {
  it("converts nodes to GeoJSON", () => {
    const featureCollection = nodesToFeatureCollection(sampleNodes);

    expect(featureCollection.type).toBe("FeatureCollection");
    expect(featureCollection.features).toHaveLength(2);
    expect(featureCollection.features[0].properties.kind).toBe("node");
  });

  it("creates flow geometries with timestamps", () => {
    const nodeMap = new Map(sampleNodes.map((node) => [node.id, node]));
    const flowCollection = flowsToFeatureCollection(sampleFlows, nodeMap);
    const feature = flowCollection.features[0];

    expect(flowCollection.features).toHaveLength(1);
    expect(feature.properties.kind).toBe("flow");
    expect(feature.geometry.coordinates.length).toBeGreaterThan(2);
    expect(feature.properties.timestamps).toHaveLength(feature.geometry.coordinates.length);
  });

  it("configures department view with stable pitch and bounded zoom", () => {
    const denseUrbanBounds: [number, number, number, number] = [-77.4, -12.5, -76.9, -11.9];
    const wideBounds: [number, number, number, number] = [-78.4, -10.8, -75.2, -6.9];

    const urbanPreset = getDepartmentViewPreset(denseUrbanBounds, true, "flows");
    const widePreset = getDepartmentViewPreset(wideBounds, true, "standard");

    expect(urbanPreset.maxZoom).toBeGreaterThan(widePreset.maxZoom);
    expect(urbanPreset.pitch).toBe(42);
    expect(widePreset.bearing).toBe(0);
    expect(urbanPreset.padding.right).toBe(urbanPreset.padding.left);
  });
});
