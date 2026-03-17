import { describe, expect, it } from "vitest";
import { PERU_DEPARTMENTS } from "@/data/departments";
import { departmentRegions, getDepartmentBounds } from "@/data/departmentRegions";

describe("department regions", () => {
  it("builds 24 region features", () => {
    expect(departmentRegions.features).toHaveLength(24);
  });

  it("covers the configured department ids with real region geometries", () => {
    const ids = new Set(departmentRegions.features.map((feature) => feature.properties.id));
    expect(ids).toEqual(new Set(PERU_DEPARTMENTS.map((department) => department.id)));

    for (const feature of departmentRegions.features) {
      const pointCount =
        feature.geometry.type === "MultiPolygon"
          ? feature.geometry.coordinates.flat(2).length
          : feature.geometry.coordinates.flat().length;

      expect(pointCount).toBeGreaterThan(12);
    }
  });

  it("returns bounds for known departments", () => {
    const bounds = getDepartmentBounds("lima");
    expect(bounds).not.toBeNull();
    expect(bounds?.[0]).toBeLessThan(bounds?.[2] ?? 0);
    expect(bounds?.[1]).toBeLessThan(bounds?.[3] ?? 0);
  });

  it("merges Callao into Lima as a multipolygon navigation region", () => {
    const limaFeature = departmentRegions.features.find((feature) => feature.properties.id === "lima");
    expect(limaFeature?.geometry.type).toBe("MultiPolygon");
    if (limaFeature?.geometry.type === "MultiPolygon") {
      expect(limaFeature.geometry.coordinates.length).toBeGreaterThan(1);
    }
  });
});
