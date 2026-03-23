import { describe, expect, it } from "vitest";
import type { LogisticsNode } from "@/types/logistics";
import { buildNodeFocusCommand, shouldShowHoverTooltip } from "@/components/map/nodeInteractionState";

const sampleNode: LogisticsNode = {
  id: "callao-port",
  name: "Puerto del Callao",
  category: "port_sea",
  region: "Callao",
  province: "Callao",
  district: "Callao",
  lat: -12.0611,
  lon: -77.1487,
  strategicLevel: "national",
  macrozone: "center",
  terrain: "coast",
  code: "CALLAO",
  description: "Puerto principal.",
  tags: ["maritimo"],
};

describe("nodeInteractionState", () => {
  it("mantiene tooltip por hover cuando no hay nodo fijado", () => {
    expect(shouldShowHoverTooltip(null, true)).toBe(true);
    expect(shouldShowHoverTooltip(null, false)).toBe(true);
  });

  it("evita reemplazar tooltip fijado al hover en mapa expandido", () => {
    expect(shouldShowHoverTooltip("callao-port", true)).toBe(false);
    expect(shouldShowHoverTooltip("callao-port", false)).toBe(true);
  });

  it("construye un comando de foco coherente para nodos pickeados en deck", () => {
    expect(buildNodeFocusCommand(sampleNode, "standard", true)).toMatchObject({
      kind: "focus",
      nodeId: sampleNode.id,
      duration: 1500,
      padding: {
        top: 92,
        right: 104,
        bottom: 92,
        left: 104,
      },
    });
  });
});
