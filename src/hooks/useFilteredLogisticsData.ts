import { useDeferredValue, useMemo } from "react";
import { getDepartmentForNode, getDepartmentNodeCounts } from "@/data/departments";
import { logisticsRepository } from "@/data";
import { useMapStore } from "@/store/useMapStore";

export function useFilteredLogisticsData() {
  const filters = useMapStore((state) => state.filters);
  const selectedDepartment = useMapStore((state) => state.selectedDepartment);
  const deferredSearch = useDeferredValue(filters.search.trim().toLowerCase());
  const nodes = logisticsRepository.getNodes();
  const flows = logisticsRepository.getFlows();
  const nodeMap = logisticsRepository.getNodeMap();

  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      if (filters.categories.length > 0 && !filters.categories.includes(node.category)) return false;
      if (filters.macrozones.length > 0 && !filters.macrozones.includes(node.macrozone)) return false;
      if (
        filters.strategicLevels.length > 0 &&
        !filters.strategicLevels.includes(node.strategicLevel)
      ) {
        return false;
      }
      if (filters.terrains.length > 0 && (!node.terrain || !filters.terrains.includes(node.terrain))) {
        return false;
      }
      if (selectedDepartment && getDepartmentForNode(node) !== selectedDepartment) return false;
      if (!deferredSearch) return true;

      const haystack = [node.name, node.region, node.province, node.district, node.code, ...node.tags]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(deferredSearch);
    });
  }, [
    deferredSearch,
    filters.categories,
    filters.macrozones,
    filters.strategicLevels,
    filters.terrains,
    nodes,
    selectedDepartment,
  ]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);

  const filteredFlows = useMemo(() => {
    if (selectedDepartment) return flows;
    return flows.filter((flow) => filteredNodeIds.has(flow.from) && filteredNodeIds.has(flow.to));
  }, [filteredNodeIds, flows, selectedDepartment]);

  const searchMatches = useMemo(() => {
    if (!deferredSearch) return [];
    return filteredNodes
      .filter((node) => node.name.toLowerCase().includes(deferredSearch))
      .slice(0, 7);
  }, [deferredSearch, filteredNodes]);

  const departmentCounts = useMemo(() => getDepartmentNodeCounts(nodes), [nodes]);

  return {
    nodes,
    flows,
    nodeMap,
    filteredNodes,
    filteredFlows,
    filteredNodeIds,
    searchMatches,
    departmentCounts,
  };
}
