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
    name: "Lurin",
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
  {
    id: "paita",
    name: "Paita",
    category: "port_sea",
    region: "Piura",
    lat: -5.0894,
    lon: -81.1144,
    strategicLevel: "national",
    macrozone: "north",
    terrain: "coast",
    description: "Puerto maritimo norte",
    tags: ["mar"],
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
    expect(featureCollection.features).toHaveLength(3);
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

  it("builds smooth sea corridors without sharp corners", () => {
    const seaFlows: LogisticsFlow[] = [
      {
        id: "paita-callao-sea",
        from: "paita",
        to: "callao",
        mode: "sea",
        importance: "primary",
        animated: true,
      },
    ];
    const nodeMap = new Map(sampleNodes.map((node) => [node.id, node]));
    const seaFeature = flowsToFeatureCollection(seaFlows, nodeMap).features[0];
    const coordinates = seaFeature.geometry.coordinates;
    const minimumEndpointLon = Math.min(sampleNodes[0].lon, sampleNodes[2].lon);

    expect(coordinates.length).toBeGreaterThan(40);
    expect(coordinates[0]).toEqual([sampleNodes[2].lon, sampleNodes[2].lat]);
    expect(coordinates.at(-1)).toEqual([sampleNodes[0].lon, sampleNodes[0].lat]);

    const interiorPoints = coordinates.slice(1, -1);
    const mostOffshoreLon = interiorPoints.reduce((minLon, [lon]) => Math.min(minLon, lon), Infinity);
    expect(mostOffshoreLon).toBeLessThan(minimumEndpointLon - 0.28);

    const maxCornerDegrees = coordinates.slice(1, -1).reduce((maxCorner, current, index) => {
      const previous = coordinates[index];
      const next = coordinates[index + 2];
      const vectorA: [number, number] = [current[0] - previous[0], current[1] - previous[1]];
      const vectorB: [number, number] = [next[0] - current[0], next[1] - current[1]];
      const lengthA = Math.hypot(vectorA[0], vectorA[1]);
      const lengthB = Math.hypot(vectorB[0], vectorB[1]);

      if (lengthA === 0 || lengthB === 0) return maxCorner;

      const cosine = (vectorA[0] * vectorB[0] + vectorA[1] * vectorB[1]) / (lengthA * lengthB);
      const angleRadians = Math.acos(Math.max(-1, Math.min(1, cosine)));
      const cornerDegrees = (angleRadians * 180) / Math.PI;
      return Math.max(maxCorner, cornerDegrees);
    }, 0);

    expect(maxCornerDegrees).toBeLessThan(14);
  });
});
