import { describe, expect, it } from "vitest";
import { flows as baseFlows } from "@/data/flows";
import { nodes } from "@/data/nodes";
import { logisticsRepository } from "@/data";

function buildPairKey(from: string, to: string): string {
  return [from, to].sort().join("|");
}

describe("logisticsRepository flow completion", () => {
  it("includes at least one flow for each declared node connection", () => {
    const flows = logisticsRepository.getFlows();
    const existingPairs = new Set(flows.map((flow) => buildPairKey(flow.from, flow.to)));

    const missingConnections: string[] = [];

    for (const node of nodes) {
      for (const connectionId of node.connections ?? []) {
        const pairKey = buildPairKey(node.id, connectionId);
        if (!existingPairs.has(pairKey)) {
          missingConnections.push(pairKey);
        }
      }
    }

    expect(missingConnections).toEqual([]);
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
