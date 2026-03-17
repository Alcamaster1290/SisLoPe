import { describe, expect, it } from "vitest";
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

  it("keeps non-land corridors as non-land when already defined", () => {
    const flows = logisticsRepository.getFlows();
    const landPairs = new Set(
      flows
        .filter((flow) => flow.mode === "land")
        .map((flow) => buildPairKey(flow.from, flow.to)),
    );

    const expectedNoLandPairs = [
      buildPairKey("callao", "chancay"),
      buildPairKey("iquitos-port", "nauta"),
      buildPairKey("iquitos-port", "yurimaguas"),
    ];

    for (const pair of expectedNoLandPairs) {
      expect(landPairs.has(pair)).toBe(false);
    }
  });
});
