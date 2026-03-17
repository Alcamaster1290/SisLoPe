import { flows } from "@/data/flows";
import { nodes } from "@/data/nodes";
import type { LogisticsFlow, LogisticsNode } from "@/types/logistics";

const nodeMap = new Map<string, LogisticsNode>(nodes.map((node) => [node.id, node]));

function buildPairKey(from: string, to: string): string {
  return [from, to].sort().join("|");
}

function inferLandImportance(source: LogisticsNode, target: LogisticsNode): LogisticsFlow["importance"] {
  if (source.strategicLevel === "national" && target.strategicLevel === "national") {
    return "primary";
  }

  if (source.category === "border" || target.category === "border") {
    return "primary";
  }

  if ((source.category === "port_sea" || target.category === "port_sea") &&
      (source.strategicLevel === "national" || target.strategicLevel === "national")) {
    return "primary";
  }

  return "secondary";
}

function buildCompletedFlows(inputNodes: LogisticsNode[], baseFlows: LogisticsFlow[]): LogisticsFlow[] {
  const completed: LogisticsFlow[] = [...baseFlows];
  const existingPairs = new Set(baseFlows.map((flow) => buildPairKey(flow.from, flow.to)));
  const addedLandPairs = new Set<string>();

  for (const sourceNode of inputNodes) {
    for (const targetId of sourceNode.connections ?? []) {
      const targetNode = nodeMap.get(targetId);
      if (!targetNode) continue;

      const pairKey = buildPairKey(sourceNode.id, targetId);
      if (existingPairs.has(pairKey) || addedLandPairs.has(pairKey)) {
        continue;
      }

      completed.push({
        id: `${sourceNode.id}-${targetId}`,
        from: sourceNode.id,
        to: targetId,
        mode: "land",
        importance: inferLandImportance(sourceNode, targetNode),
        animated: true,
      });

      addedLandPairs.add(pairKey);
    }
  }

  return completed;
}

const completedFlows = buildCompletedFlows(nodes, flows);

export const logisticsRepository = {
  getNodes(): LogisticsNode[] {
    return nodes;
  },
  getFlows(): LogisticsFlow[] {
    return completedFlows;
  },
  getNodeMap(): Map<string, LogisticsNode> {
    return nodeMap;
  },
  getNodeById(id: string): LogisticsNode | undefined {
    return nodeMap.get(id);
  },
};
