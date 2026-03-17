import { flows } from "@/data/flows";
import { nodes } from "@/data/nodes";
import type { LogisticsFlow, LogisticsNode } from "@/types/logistics";

const nodeMap = new Map<string, LogisticsNode>(nodes.map((node) => [node.id, node]));

export const logisticsRepository = {
  getNodes(): LogisticsNode[] {
    return nodes;
  },
  getFlows(): LogisticsFlow[] {
    return flows;
  },
  getNodeMap(): Map<string, LogisticsNode> {
    return nodeMap;
  },
  getNodeById(id: string): LogisticsNode | undefined {
    return nodeMap.get(id);
  },
};
