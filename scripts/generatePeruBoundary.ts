/**
 * Generates peruBoundary.ts by computing the union of all 24 department
 * polygons from peruDepartmentsGeojson.ts. Run with:
 *   npx tsx scripts/generatePeruBoundary.ts
 */
import { union } from "@turf/turf";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Must use relative import — this script runs outside Vite so @/ alias is not available
import { peruDepartmentsGeojson } from "../src/data/peruDepartmentsGeojson.js";

const departmentCollection = peruDepartmentsGeojson as unknown as FeatureCollection<
  Polygon | MultiPolygon
>;

const merged = union(departmentCollection);
if (!merged) {
  console.error("union() returned null — check department geometry topology");
  process.exit(1);
}

const boundaryFeature: Feature<Polygon | MultiPolygon> = {
  ...merged,
  id: "PER",
  properties: { name: "Peru" },
};

const output = `const peruBoundary = {
  type: "FeatureCollection",
  features: [
    ${JSON.stringify(boundaryFeature, null, 4)
      .split("\n")
      .join("\n    ")},
  ],
} as const;

export default peruBoundary;
`;

const outPath = resolve(import.meta.dirname, "../src/data/peruBoundary.ts");
writeFileSync(outPath, output, "utf-8");
console.log(`Written ${outPath}`);
const coordCount =
  boundaryFeature.geometry.type === "Polygon"
    ? boundaryFeature.geometry.coordinates[0].length
    : boundaryFeature.geometry.coordinates.reduce((s, ring) => s + ring[0].length, 0);
console.log(`Geometry type: ${boundaryFeature.geometry.type} — ~${coordCount} vertices`);
