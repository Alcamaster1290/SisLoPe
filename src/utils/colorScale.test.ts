import { describe, expect, it } from "vitest";
import {
  getCategoryColorHex,
  getFlowColor,
  getNodeRadius,
  getNodeWeight,
} from "@/utils/colorScale";

describe("colorScale", () => {
  it("keeps stable category colors", () => {
    expect(getCategoryColorHex("port_sea")).toBe("#4e7fd7");
    expect(getCategoryColorHex("border")).toBe("#c55f5b");
  });

  it("assigns larger symbols to more strategic nodes", () => {
    expect(getNodeRadius({ strategicLevel: "national", category: "inland_hub" })).toBeGreaterThan(
      getNodeRadius({ strategicLevel: "complementary", category: "inland_hub" }),
    );
    expect(getNodeWeight({ strategicLevel: "national" })).toBeGreaterThan(
      getNodeWeight({ strategicLevel: "regional" }),
    );
  });

  it("boosts primary flow opacity", () => {
    expect(getFlowColor("land", "primary")[3]).toBeGreaterThan(
      getFlowColor("land", "secondary")[3],
    );
  });
});
