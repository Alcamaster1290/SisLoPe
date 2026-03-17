import { describe, expect, it } from "vitest";
import {
  getDepartmentFocus,
  getDepartmentForNode,
  getDepartmentNodeCounts,
} from "@/data/departments";
import type { LogisticsNode } from "@/types/logistics";

const sampleNodes: LogisticsNode[] = [
  {
    id: "callao",
    name: "Puerto del Callao",
    category: "port_sea",
    region: "Callao",
    lat: -12.05,
    lon: -77.14,
    strategicLevel: "national",
    macrozone: "center",
    terrain: "coast",
    description: "Nodo maritimo",
    tags: ["puerto"],
  },
  {
    id: "chancay",
    name: "Puerto de Chancay",
    category: "port_sea",
    region: "Lima",
    lat: -11.56,
    lon: -77.27,
    strategicLevel: "national",
    macrozone: "center",
    terrain: "coast",
    description: "Nodo maritimo",
    tags: ["puerto"],
  },
  {
    id: "ilo",
    name: "Puerto de Ilo",
    category: "port_sea",
    region: "Moquegua",
    lat: -17.639,
    lon: -71.337,
    strategicLevel: "national",
    macrozone: "south",
    terrain: "coast",
    description: "Nodo maritimo",
    tags: ["puerto"],
  },
];

describe("department helpers", () => {
  it("maps Callao nodes into Lima department filter", () => {
    expect(getDepartmentForNode(sampleNodes[0])).toBe("lima");
  });

  it("creates stable node counts by department", () => {
    const counts = getDepartmentNodeCounts(sampleNodes);
    expect(counts.lima).toBe(2);
    expect(counts.moquegua).toBe(1);
  });

  it("focuses department using dataset spread when nodes are available", () => {
    const focus = getDepartmentFocus("lima", sampleNodes);
    expect(focus.longitude).toBeLessThan(-77);
    expect(focus.latitude).toBeLessThan(-11.5);
    expect(focus.zoom).toBeGreaterThan(7);
  });
});
