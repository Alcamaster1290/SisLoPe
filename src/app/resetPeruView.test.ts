import { describe, expect, it, vi } from "vitest";
import type { CameraPadding } from "@/types/logistics";
import { resetPeruView } from "@/app/resetPeruView";

describe("resetPeruView", () => {
  it("limpia foco de departamento y nodo antes de pedir el reset de camara", () => {
    const padding: CameraPadding = { top: 24, right: 42, bottom: 28, left: 18 };
    const getCameraPadding = vi.fn(() => padding);
    const clearCameraBeforeNodeFocus = vi.fn();
    const setDepartment = vi.fn();
    const selectNode = vi.fn();
    const requestCameraCommand = vi.fn();

    resetPeruView({
      isMapExpanded: true,
      getCameraPadding,
      clearCameraBeforeNodeFocus,
      setDepartment,
      selectNode,
      requestCameraCommand,
    });

    expect(clearCameraBeforeNodeFocus).toHaveBeenCalledTimes(1);
    expect(setDepartment).toHaveBeenCalledWith(null);
    expect(selectNode).toHaveBeenCalledWith(null, "system");
    expect(getCameraPadding).toHaveBeenCalledWith(true);
    expect(requestCameraCommand).toHaveBeenCalledWith(
      {
        kind: "reset",
        duration: 1600,
        padding,
      },
      "user",
    );
  });
});
