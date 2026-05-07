import { booleanPointInPolygon, buffer, point as turfPoint } from "@turf/turf";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { describe, expect, it } from "vitest";
import { nodes } from "@/data/nodes";
import peruBoundary from "@/data/peruBoundary";

const PERU_BOUNDARY_TOLERANCE_KM = 10;

describe("nodes geospatial placement", () => {
  it("places Santa Rosa at the Tacna border complex, not Chacalluta airport", () => {
    const santaRosa = nodes.find((node) => node.id === "santa-rosa");

    expect(santaRosa).toBeDefined();
    expect(santaRosa?.region).toBe("Tacna");
    expect(santaRosa?.lat).toBeCloseTo(-18.30649, 4);
    expect(santaRosa?.lon).toBeCloseTo(-70.31376, 4);
  });

  it("keeps key customs and border control nodes represented", () => {
    const nodeIds = new Set(nodes.map((node) => node.id));

    expect(Array.from(nodeIds)).toEqual(
      expect.arrayContaining([
        "alamor",
        "la-balsa",
        "aduana-arequipa",
        "aduana-desaguadero",
        "aduana-santa-rosa",
      ]),
    );
  });

  it("keeps nodes inside Peru geometry or close to the national boundary", () => {
    const peruFeature = peruBoundary.features[0] as unknown as Feature<Polygon | MultiPolygon>;
    const bufferedPeru = buffer(peruFeature, PERU_BOUNDARY_TOLERANCE_KM, { units: "kilometers" });

    const outliers = nodes
      .map((node) => {
        const point = turfPoint([node.lon, node.lat]);
        const inside = bufferedPeru ? booleanPointInPolygon(point, bufferedPeru) : false;
        return {
          id: node.id,
          insideBufferedBoundary: inside,
        };
      })
      .filter((entry) => !entry.insideBufferedBoundary);

    expect(outliers).toEqual([]);
  });
});
