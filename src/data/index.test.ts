import { describe, expect, it } from "vitest";
import { flows as baseFlows } from "@/data/flows";
import { nodes } from "@/data/nodes";
import { logisticsRepository } from "@/data";

function buildPairKey(from: string, to: string): string {
  return [from, to].sort().join("|");
}

describe("logisticsRepository flow completion", () => {
  it("keeps land flows limited to customs and inland hub nodes", () => {
    const flows = logisticsRepository.getFlows();
    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const allowedCategories = new Set(["aduana", "inland_hub"]);
    const disallowedLand = flows
      .filter((flow) => flow.mode === "land")
      .filter((flow) => {
        const source = nodesById.get(flow.from);
        const target = nodesById.get(flow.to);
        return !source || !target || !allowedCategories.has(source.category) || !allowedCategories.has(target.category);
      })
      .map((flow) => flow.id);

    expect(disallowedLand).toEqual([]);
  });

  it("does not auto-generate land flows from node connections outside customs and inland hubs", () => {
    const flows = logisticsRepository.getFlows();
    const landPairs = new Set(
      flows
        .filter((flow) => flow.mode === "land")
        .map((flow) => buildPairKey(flow.from, flow.to)),
    );

    expect(landPairs.has(buildPairKey("callao", "lurin"))).toBe(false);
    expect(landPairs.has(buildPairKey("zofratacna", "santa-rosa"))).toBe(false);
    expect(landPairs.has(buildPairKey("aduana-tacna", "aduana-santa-rosa"))).toBe(true);
    expect(landPairs.has(buildPairKey("aduana-pisco", "ica-hub"))).toBe(true);
    expect(landPairs.has(buildPairKey("sullana-hub", "piura-hub"))).toBe(true);
  });

  it("does not auto-generate land on pairs already defined in another mode", () => {
    const flows = logisticsRepository.getFlows();
    const landPairs = new Set(
      flows
        .filter((flow) => flow.mode === "land")
        .map((flow) => buildPairKey(flow.from, flow.to)),
    );

    const pairModes = new Map<string, Set<string>>();
    for (const flow of baseFlows) {
      const key = buildPairKey(flow.from, flow.to);
      if (!pairModes.has(key)) pairModes.set(key, new Set<string>());
      pairModes.get(key)!.add(flow.mode);
    }

    for (const [pairKey, modes] of pairModes) {
      const hasNonLand = Array.from(modes).some((mode) => mode !== "land");
      const hasLand = modes.has("land");
      if (hasNonLand && !hasLand) {
        expect(landPairs.has(pairKey)).toBe(false);
      }
    }
  });

  it("includes multimodal sea and air corridors for internal logistics", () => {
    const flows = logisticsRepository.getFlows();
    const flowIds = new Set(flows.map((flow) => flow.id));
    const seaCount = flows.filter((flow) => flow.mode === "sea").length;
    const airCount = flows.filter((flow) => flow.mode === "air").length;

    expect(seaCount).toBeGreaterThanOrEqual(10);
    expect(airCount).toBeGreaterThanOrEqual(10);
    expect(flowIds.has("paita-salaverry")).toBe(true);
    expect(flowIds.has("matarani-ilo-sea")).toBe(true);
    expect(flowIds.has("jorge-chavez-cusco-air")).toBe(true);
    expect(flowIds.has("jorge-chavez-iquitos-air")).toBe(true);
  });

  it("ensures every flow references existing nodes", () => {
    const nodesById = new Set(nodes.map((node) => node.id));
    const flows = logisticsRepository.getFlows();

    for (const flow of flows) {
      expect(nodesById.has(flow.from)).toBe(true);
      expect(nodesById.has(flow.to)).toBe(true);
    }
  });

  it("avoids duplicate flow pairs regardless of mode", () => {
    const flows = logisticsRepository.getFlows();
    const pairCounts = new Map<string, number>();

    for (const flow of flows) {
      const key = buildPairKey(flow.from, flow.to);
      pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
    }

    const duplicates = Array.from(pairCounts.entries()).filter(([, count]) => count > 1);
    expect(duplicates).toEqual([]);
  });
});
