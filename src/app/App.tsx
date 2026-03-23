import { lazy, Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import { getDepartmentFocus } from "@/data/departments";
import { getDepartmentBounds } from "@/data/departmentRegions";
import { LogisticsMap } from "@/components/map/LogisticsMap";
import { FiltersPanel } from "@/components/map/FiltersPanel";
import { MapLegend } from "@/components/map/MapLegend";
import { TopBar } from "@/components/ui/TopBar";
import { useFilteredLogisticsData } from "@/hooks/useFilteredLogisticsData";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { usePresentationTour } from "@/hooks/usePresentationTour";
import { resetPeruView } from "@/app/resetPeruView";
import { createHttpMaritimeFleetHeatmapReadService } from "@/lib/maritimeHeatmap/adapters/http";
import { noopMaritimeFleetHeatmapReadService } from "@/lib/maritimeHeatmap/adapters/noop";
import { getMaritimeTrackingFeatureFlags } from "@/lib/maritimeTracking/flags";
import { exportViewAsPng } from "@/lib/exportView";
import { useMapStore } from "@/store/useMapStore";
import type { DepartmentId, LogisticsNode, NodeCategory } from "@/types/logistics";
import { getDepartmentViewPreset, getNodeFocusCamera, getSuggestedPadding } from "@/utils/geo";
import { CATEGORY_META } from "@/utils/colorScale";

const LazySidePanel = lazy(() => import("@/components/map/SidePanel"));

export function App() {
  const rootRef = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();
  const themeDepth = useMapStore((state) => state.themeDepth);
  const viewMode = useMapStore((state) => state.viewMode);
  const showLabels = useMapStore((state) => state.showLabels);
  const showFlows = useMapStore((state) => state.showFlows);
  const showCorridors = useMapStore((state) => state.showCorridors);
  const showFleetHeatmap = useMapStore((state) => state.showFleetHeatmap);
  const isMapExpanded = useMapStore((state) => state.isMapExpanded);
  const selectedNodeId = useMapStore((state) => state.selectedNodeId);
  const activeCategories = useMapStore((state) => state.filters.categories);
  const cameraBeforeNodeFocus = useMapStore((state) => state.cameraBeforeNodeFocus);
  const exportPending = useMapStore((state) => state.exportPending);
  const presentation = useMapStore((state) => state.presentation);
  const setViewMode = useMapStore((state) => state.setViewMode);
  const setThemeDepth = useMapStore((state) => state.setThemeDepth);
  const toggleLabels = useMapStore((state) => state.toggleLabels);
  const toggleFlows = useMapStore((state) => state.toggleFlows);
  const toggleCorridors = useMapStore((state) => state.toggleCorridors);
  const toggleFleetHeatmap = useMapStore((state) => state.toggleFleetHeatmap);
  const toggleMapExpanded = useMapStore((state) => state.toggleMapExpanded);
  const setCategoryFilters = useMapStore((state) => state.setCategoryFilters);
  const clearCategoryFilters = useMapStore((state) => state.clearCategoryFilters);
  const resetFilters = useMapStore((state) => state.resetFilters);
  const selectNode = useMapStore((state) => state.selectNode);
  const setDepartment = useMapStore((state) => state.setDepartment);
  const requestCameraCommand = useMapStore((state) => state.requestCameraCommand);
  const rememberCameraBeforeNodeFocus = useMapStore((state) => state.rememberCameraBeforeNodeFocus);
  const clearCameraBeforeNodeFocus = useMapStore((state) => state.clearCameraBeforeNodeFocus);
  const setExportPending = useMapStore((state) => state.setExportPending);
  const startPresentation = useMapStore((state) => state.startPresentation);
  const pausePresentation = useMapStore((state) => state.pausePresentation);
  const resumePresentation = useMapStore((state) => state.resumePresentation);
  const stopPresentation = useMapStore((state) => state.stopPresentation);
  const { nodeMap, filteredNodes, filteredFlows, filteredNodeIds, searchMatches, departmentCounts, nodes } =
    useFilteredLogisticsData();
  const maritimeFeatureFlags = useMemo(() => getMaritimeTrackingFeatureFlags(), []);
  const maritimeHeatmapFeatureEnabled = maritimeFeatureFlags.heatmapEnabled;
  const maritimeHeatmapService = useMemo(
    () =>
      maritimeHeatmapFeatureEnabled && maritimeFeatureFlags.apiBaseUrl
        ? createHttpMaritimeFleetHeatmapReadService(maritimeFeatureFlags.apiBaseUrl)
        : noopMaritimeFleetHeatmapReadService,
    [maritimeFeatureFlags.apiBaseUrl, maritimeHeatmapFeatureEnabled],
  );

  const getCameraPadding = useCallback(
    (expanded: boolean) => {
      const base = getSuggestedPadding(isDesktop);
      if (!isDesktop) return base;
      return {
        ...base,
        right: expanded ? 42 : 104,
      };
    },
    [isDesktop],
  );

  usePresentationTour(isDesktop);

  useEffect(() => {
    if (selectedNodeId && !filteredNodeIds.has(selectedNodeId)) {
      selectNode(null, "system");
    }
  }, [filteredNodeIds, selectedNodeId, selectNode]);

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) ?? null : null;
  const allCategories = useMemo(() => Object.keys(CATEGORY_META) as NodeCategory[], []);
  const categoryTotals = useMemo(() => {
    const totals = allCategories.reduce<Record<NodeCategory, number>>((accumulator, category) => {
      accumulator[category] = 0;
      return accumulator;
    }, {} as Record<NodeCategory, number>);

    for (const node of nodes) {
      totals[node.category] += 1;
    }

    return totals;
  }, [allCategories, nodes]);
  const availableCategories = useMemo(
    () => allCategories.filter((category) => categoryTotals[category] > 0),
    [allCategories, categoryTotals],
  );

  const connectedNodes = useMemo<LogisticsNode[]>(() => {
    if (!selectedNode?.connections) return [];

    return selectedNode.connections
      .map((connectionId) => nodeMap.get(connectionId))
      .filter((entry): entry is LogisticsNode => Boolean(entry));
  }, [nodeMap, selectedNode]);

  const focusNode = (nodeId: string) => {
    const node = nodeMap.get(nodeId);
    if (!node) return;
    rememberCameraBeforeNodeFocus(useMapStore.getState().camera);

    selectNode(nodeId, "user");
    const focus = getNodeFocusCamera(node, viewMode);
    requestCameraCommand(
      {
        kind: "focus",
        nodeId,
        zoom: focus.zoom,
        pitch: focus.pitch,
        bearing: focus.bearing,
        duration: 2200,
        padding: getCameraPadding(isMapExpanded),
      },
      "user",
    );
  };

  const resetCamera = () => {
    resetPeruView({
      isMapExpanded,
      getCameraPadding,
      clearCameraBeforeNodeFocus,
      setDepartment,
      selectNode,
      requestCameraCommand,
    });
  };

  const focusDepartment = (departmentId: DepartmentId | null) => {
    setDepartment(departmentId);
    clearCameraBeforeNodeFocus();

    if (!showLabels && viewMode !== "density") {
      toggleLabels();
    }

    selectNode(null, "system");

    if (!departmentId) {
      requestCameraCommand(
        {
          kind: "reset",
          duration: 1600,
          padding: getCameraPadding(isMapExpanded),
        },
        "user",
      );
      return;
    }

    const bounds = getDepartmentBounds(departmentId);
    const focus = getDepartmentFocus(departmentId, nodes);
    const departmentView = bounds ? getDepartmentViewPreset(bounds, isDesktop, viewMode) : null;
    const departmentPadding = departmentView
      ? {
          ...departmentView.padding,
          right: getCameraPadding(isMapExpanded).right,
        }
      : getCameraPadding(isMapExpanded);

    requestCameraCommand(
      bounds
        ? {
            kind: "fitBounds",
            bounds,
            duration: departmentView?.duration ?? 1700,
            padding: departmentPadding,
            maxZoom: departmentView?.maxZoom ?? Math.max(7.5, focus.zoom),
            pitch: departmentView?.pitch,
            bearing: departmentView?.bearing,
          }
        : {
            kind: "focus",
            longitude: focus.longitude,
            latitude: focus.latitude,
            zoom: focus.zoom,
            pitch: 34,
            bearing: 0,
            duration: 1850,
            padding: getCameraPadding(isMapExpanded),
          },
      "user",
    );
  };

  const exportCurrentView = async () => {
    if (!rootRef.current) return;

    setExportPending(true);

    try {
      const dateStamp = new Date().toISOString().slice(0, 10);
      await exportViewAsPng(rootRef.current, `sislope-logistics-${dateStamp}.png`);
    } catch (error) {
      console.error("No se pudo exportar la vista actual.", error);
    } finally {
      setExportPending(false);
    }
  };

  const closeNodeDetails = () => {
    selectNode(null, "user");

    if (cameraBeforeNodeFocus) {
      requestCameraCommand(
        {
          kind: "focus",
          longitude: cameraBeforeNodeFocus.longitude,
          latitude: cameraBeforeNodeFocus.latitude,
          zoom: cameraBeforeNodeFocus.zoom,
          pitch: cameraBeforeNodeFocus.pitch,
          bearing: cameraBeforeNodeFocus.bearing,
          duration: 1300,
          padding: getCameraPadding(isMapExpanded),
        },
        "user",
      );
      clearCameraBeforeNodeFocus();
      return;
    }

    resetCamera();
  };

  useEffect(() => {
    if (activeCategories.length === 0) return;

    const validCategories = activeCategories.filter((category) =>
      availableCategories.includes(category),
    );
    if (validCategories.length === activeCategories.length) return;
    setCategoryFilters(validCategories);
  }, [activeCategories, availableCategories, setCategoryFilters]);

  const handleLegendToggleCategory = useCallback(
    (category: NodeCategory) => {
      if (!availableCategories.includes(category)) return;

      if (activeCategories.length === 0) {
        setCategoryFilters([category]);
        return;
      }

      if (activeCategories.includes(category)) {
        const next = activeCategories.filter((entry) => entry !== category);
        setCategoryFilters(next);
        return;
      }

      const next = [...new Set([...activeCategories, category])].filter((entry) =>
        availableCategories.includes(entry),
      );
      if (next.length >= availableCategories.length) {
        clearCategoryFilters();
        return;
      }

      setCategoryFilters(next);
    },
    [activeCategories, availableCategories, clearCategoryFilters, setCategoryFilters],
  );

  const resetFiltersAndView = useCallback(() => {
    resetFilters();
    selectNode(null, "system");
    clearCameraBeforeNodeFocus();
    requestCameraCommand(
      {
        kind: "reset",
        duration: 1400,
        padding: getCameraPadding(isMapExpanded),
      },
      "user",
    );
  }, [
    clearCameraBeforeNodeFocus,
    getCameraPadding,
    isMapExpanded,
    requestCameraCommand,
    resetFilters,
    selectNode,
  ]);

  const handleToggleMapExpanded = useCallback(() => {
    const nextExpanded = !isMapExpanded;
    toggleMapExpanded();
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const currentCamera = useMapStore.getState().camera;
        requestCameraCommand(
          {
            kind: "focus",
            longitude: currentCamera.longitude,
            latitude: currentCamera.latitude,
            zoom: currentCamera.zoom,
            pitch: currentCamera.pitch,
            bearing: currentCamera.bearing,
            duration: 700,
            padding: getCameraPadding(nextExpanded),
          },
          "user",
        );
      });
    });
  }, [getCameraPadding, isMapExpanded, requestCameraCommand, toggleMapExpanded]);

  return (
    <div ref={rootRef} data-theme-depth={themeDepth} className="app-shell flex min-h-screen flex-col pb-5">
      <TopBar
        visibleNodeCount={filteredNodes.length}
        visibleFlowCount={filteredFlows.length}
        viewMode={viewMode}
        themeDepth={themeDepth}
        showLabels={showLabels}
        showFlows={showFlows}
        showCorridors={showCorridors}
        showFleetHeatmap={showFleetHeatmap}
        showFleetHeatmapControl={maritimeHeatmapFeatureEnabled}
        exportPending={exportPending}
        presentation={presentation}
        onViewModeChange={setViewMode}
        onToggleThemeDepth={() => setThemeDepth(themeDepth === "light" ? "dark" : "light")}
        onToggleLabels={toggleLabels}
        onToggleFlows={toggleFlows}
        onToggleCorridors={toggleCorridors}
        onToggleFleetHeatmap={toggleFleetHeatmap}
        onResetCamera={resetCamera}
        onExport={exportCurrentView}
        onStartPresentation={startPresentation}
        onPausePresentation={pausePresentation}
        onResumePresentation={resumePresentation}
        onStopPresentation={stopPresentation}
      />

      <main
        className={`relative z-10 grid flex-1 gap-4 px-4 pb-4 lg:min-h-[calc(100vh-11rem)] ${
          isMapExpanded
            ? "lg:grid-cols-[minmax(18rem,21rem)_minmax(0,1fr)] lg:items-stretch"
            : "lg:grid-cols-[minmax(18rem,21rem)_minmax(0,1fr)_minmax(20rem,24rem)]"
        }`}
      >
        <FiltersPanel
          filteredCount={filteredNodes.length}
          totalCount={nodes.length}
          departmentCounts={departmentCounts}
          searchMatches={searchMatches}
          availableCategories={availableCategories}
          categoryTotals={categoryTotals}
          onFocusNode={focusNode}
          onFocusDepartment={focusDepartment}
          onToggleCategory={handleLegendToggleCategory}
          onResetAllFilters={resetFiltersAndView}
        />

        <section
          className={`order-1 rounded-[30px] lg:order-2 ${
            isMapExpanded ? "overflow-visible lg:h-full lg:min-h-0" : "h-[68vh] min-h-[32rem] overflow-hidden lg:h-full lg:min-h-0"
          }`}
        >
          <div
            className={`grid gap-4 ${
              isMapExpanded ? "min-h-0 lg:h-full lg:grid-rows-[minmax(0,1fr)_auto]" : "h-full"
            }`}
          >
            <div
              className={`panel-shell-strong relative overflow-hidden rounded-[30px] ${
                isMapExpanded ? "h-[72vh] min-h-[34rem] lg:h-full lg:min-h-[42rem]" : "h-full"
              }`}
            >
              <LogisticsMap
                nodes={filteredNodes}
                flows={filteredFlows}
                nodeMap={nodeMap}
                isDesktop={isDesktop}
                isMapExpanded={isMapExpanded}
                heatmapEnabled={maritimeHeatmapFeatureEnabled}
                showFleetHeatmap={showFleetHeatmap}
                heatmapService={maritimeHeatmapService}
                onResetCamera={resetCamera}
                onToggleMapExpanded={handleToggleMapExpanded}
                onSelectDepartment={focusDepartment}
              />
              <div className="absolute bottom-4 left-4 z-20">
                <MapLegend
                  visibleNodes={filteredNodes}
                  availableCategories={availableCategories}
                  categoryTotals={categoryTotals}
                  activeCategories={activeCategories}
                  onToggleCategory={handleLegendToggleCategory}
                  onClearCategories={clearCategoryFilters}
                />
              </div>
            </div>

            {isMapExpanded ? (
              <Suspense
                fallback={
                  <aside className="panel-shell min-h-[18rem] rounded-[28px] px-5 py-5">
                    <div className="font-['Rajdhani'] text-xl font-semibold uppercase tracking-[0.1em] text-[var(--text-strong)]">
                      Cargando panel
                    </div>
                  </aside>
                }
              >
                <LazySidePanel
                  node={selectedNode}
                  connections={connectedNodes}
                  onFocusNode={focusNode}
                  onClose={closeNodeDetails}
                />
              </Suspense>
            ) : null}
          </div>
        </section>

        {!isMapExpanded ? (
          <Suspense
            fallback={
              <aside className="panel-shell order-3 min-h-[18rem] rounded-[28px] px-5 py-5 lg:min-h-0">
                <div className="font-['Rajdhani'] text-xl font-semibold uppercase tracking-[0.1em] text-[var(--text-strong)]">
                  Cargando panel
                </div>
              </aside>
            }
          >
            <LazySidePanel
              node={selectedNode}
              connections={connectedNodes}
              onFocusNode={focusNode}
              onClose={closeNodeDetails}
            />
          </Suspense>
        ) : null}
      </main>
    </div>
  );
}
