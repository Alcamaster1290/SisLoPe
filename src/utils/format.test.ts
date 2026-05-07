import { describe, expect, it } from "vitest";
import { formatCoordinate } from "@/utils/format";

describe("formatCoordinate", () => {
  it("uses the degree symbol and the correct hemisphere for latitude", () => {
    expect(formatCoordinate(-12.056, "lat")).toBe("12.0560° S");
    expect(formatCoordinate(0.5, "lat")).toBe("0.5000° N");
  });

  it("uses the degree symbol and the correct hemisphere for longitude", () => {
    expect(formatCoordinate(-77.148, "lon")).toBe("77.1480° O");
    expect(formatCoordinate(10.25, "lon")).toBe("10.2500° E");
  });

  it("does not emit the literal 'deg' anywhere in the output", () => {
    expect(formatCoordinate(-9.45, "lat")).not.toMatch(/deg/);
    expect(formatCoordinate(-75.35, "lon")).not.toMatch(/deg/);
  });
});
