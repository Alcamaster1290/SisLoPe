import { describe, expect, it } from "vitest";
import {
  DEFAULT_MARITIME_FRAME_ID,
  getMaritimeFrame,
  MARITIME_FRAMES,
  toBoundingBoxTuple,
  tryGetMaritimeFrame,
  type MaritimeFrameBounds,
} from "@/data/maritimeFrames";

const PERU_OUTER_REGION: MaritimeFrameBounds = {
  west: -85,
  south: -19,
  east: -69,
  north: 1,
};

function isInside(inner: MaritimeFrameBounds, outer: MaritimeFrameBounds): boolean {
  return (
    inner.west >= outer.west &&
    inner.east <= outer.east &&
    inner.south >= outer.south &&
    inner.north <= outer.north
  );
}

describe("maritimeFrames", () => {
  it("each frame has a valid bounding box (west < east, south < north)", () => {
    for (const frame of MARITIME_FRAMES) {
      expect(frame.bounds.west, `${frame.id}: west must be < east`).toBeLessThan(
        frame.bounds.east,
      );
      expect(frame.bounds.south, `${frame.id}: south must be < north`).toBeLessThan(
        frame.bounds.north,
      );
    }
  });

  it("every coastal sub-frame fits inside the peru-eez frame", () => {
    const eez = getMaritimeFrame("peru-eez").bounds;
    const subFrames = MARITIME_FRAMES.filter((frame) => frame.id !== "peru-eez");

    expect(subFrames.length).toBeGreaterThan(0);
    for (const frame of subFrames) {
      expect(isInside(frame.bounds, eez), `${frame.id} must fit inside peru-eez`).toBe(
        true,
      );
    }
  });

  it("frames stay inside the broader Peru region (no global queries)", () => {
    for (const frame of MARITIME_FRAMES) {
      expect(isInside(frame.bounds, PERU_OUTER_REGION), `${frame.id} out of range`).toBe(
        true,
      );
    }
  });

  it("frame ids are unique", () => {
    const ids = MARITIME_FRAMES.map((frame) => frame.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("DEFAULT_MARITIME_FRAME_ID resolves to a known frame", () => {
    expect(getMaritimeFrame(DEFAULT_MARITIME_FRAME_ID)).toBeDefined();
  });

  it("tryGetMaritimeFrame returns null for an unknown id", () => {
    expect(tryGetMaritimeFrame("does-not-exist")).toBeNull();
    expect(tryGetMaritimeFrame("peru-eez")?.id).toBe("peru-eez");
  });

  it("getMaritimeFrame throws for an unknown id", () => {
    expect(() => getMaritimeFrame("does-not-exist" as never)).toThrow();
  });

  it("toBoundingBoxTuple emits [west, south, east, north]", () => {
    const tuple = toBoundingBoxTuple({ west: -84, south: -18, east: -70, north: 0 });
    expect(tuple).toEqual([-84, -18, -70, 0]);
  });
});
