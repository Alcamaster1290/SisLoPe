import type { ActionOrigin, CameraCommand, CameraPadding, DepartmentId } from "@/types/logistics";

interface ResetPeruViewOptions {
  isMapExpanded: boolean;
  getCameraPadding: (expanded: boolean) => CameraPadding;
  clearCameraBeforeNodeFocus: () => void;
  setDepartment: (department: DepartmentId | null) => void;
  selectNode: (nodeId: string | null, origin?: ActionOrigin) => void;
  requestCameraCommand: (command: Omit<CameraCommand, "nonce">, origin?: ActionOrigin) => void;
}

export function resetPeruView({
  isMapExpanded,
  getCameraPadding,
  clearCameraBeforeNodeFocus,
  setDepartment,
  selectNode,
  requestCameraCommand,
}: ResetPeruViewOptions): void {
  clearCameraBeforeNodeFocus();
  setDepartment(null);
  selectNode(null, "system");
  requestCameraCommand(
    {
      kind: "reset",
      duration: 1600,
      padding: getCameraPadding(isMapExpanded),
    },
    "user",
  );
}
