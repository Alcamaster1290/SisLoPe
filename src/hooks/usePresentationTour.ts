import { useEffect } from "react";
import { logisticsRepository } from "@/data";
import { useMapStore } from "@/store/useMapStore";
import { getNodeFocusCamera, getSuggestedPadding } from "@/utils/geo";

export function usePresentationTour(isDesktop: boolean): void {
  const presentation = useMapStore((state) => state.presentation);
  const requestCameraCommand = useMapStore((state) => state.requestCameraCommand);
  const selectNode = useMapStore((state) => state.selectNode);
  const advancePresentation = useMapStore((state) => state.advancePresentation);

  useEffect(() => {
    if (!presentation.active) return;

    const currentNodeId = presentation.sequence[presentation.currentIndex];
    const node = logisticsRepository.getNodeById(currentNodeId);

    if (!node) return;

    const focus = getNodeFocusCamera(node, "flows");
    selectNode(node.id, "presentation");
    requestCameraCommand(
      {
        kind: "focus",
        nodeId: node.id,
        zoom: focus.zoom,
        pitch: focus.pitch,
        bearing: focus.bearing,
        duration: 3200,
        padding: getSuggestedPadding(isDesktop),
      },
      "presentation",
    );
  }, [
    isDesktop,
    presentation.active,
    presentation.currentIndex,
    presentation.sequence,
    requestCameraCommand,
    selectNode,
  ]);

  useEffect(() => {
    if (!presentation.active || presentation.paused) return;

    const interval = window.setInterval(() => {
      advancePresentation();
    }, 5200);

    return () => window.clearInterval(interval);
  }, [advancePresentation, presentation.active, presentation.paused]);
}
