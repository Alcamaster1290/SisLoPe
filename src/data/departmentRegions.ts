import { bbox as turfBbox, center as turfCenter, featureCollection } from "@turf/turf";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { PERU_DEPARTMENTS } from "@/data/departments";
import { peruDepartmentsGeojson } from "@/data/peruDepartmentsGeojson";
import type { DepartmentId } from "@/types/logistics";

type RegionGeometry = Polygon | MultiPolygon;

interface DepartmentRegionProperties {
  id: DepartmentId;
  name: string;
  center: [number, number];
  bbox: [number, number, number, number];
}

export type DepartmentFeature = Feature<RegionGeometry, DepartmentRegionProperties>;
export type DepartmentFeatureCollection = FeatureCollection<RegionGeometry, DepartmentRegionProperties>;

function asBoundsTuple(raw: number[]): [number, number, number, number] {
  return [raw[0], raw[1], raw[2], raw[3]];
}

function buildDepartmentRegionFeatures(): DepartmentFeatureCollection {
  const labelById = new Map(PERU_DEPARTMENTS.map((department) => [department.id, department.label]));
  const features: DepartmentFeature[] = [];

  for (const rawFeature of peruDepartmentsGeojson.features) {
    const clonedFeature = JSON.parse(JSON.stringify(rawFeature)) as Feature<RegionGeometry, { id: DepartmentId }>;
    const id = clonedFeature.properties.id;
    const bbox = asBoundsTuple(turfBbox(clonedFeature));
    const centerPoint = turfCenter(clonedFeature).geometry.coordinates as [number, number];

    features.push({
      type: "Feature",
      id,
      geometry: clonedFeature.geometry,
      properties: {
        id,
        name: labelById.get(id) ?? id,
        center: centerPoint,
        bbox,
      },
    });
  }

  return featureCollection(features) as DepartmentFeatureCollection;
}

export const departmentRegions = buildDepartmentRegionFeatures();

const boundsById = new Map<DepartmentId, [number, number, number, number]>(
  departmentRegions.features.map((feature) => [feature.properties.id, feature.properties.bbox]),
);

export function getDepartmentBounds(departmentId: DepartmentId): [number, number, number, number] | null {
  return boundsById.get(departmentId) ?? null;
}
