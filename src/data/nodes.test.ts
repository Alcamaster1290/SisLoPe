import { booleanPointInPolygon, buffer, point as turfPoint } from "@turf/turf";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { describe, expect, it } from "vitest";
import { nodes } from "@/data/nodes";
import peruBoundary from "@/data/peruBoundary";

const PERU_BOUNDARY_TOLERANCE_KM = 10;

describe("nodes geospatial placement", () => {
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
