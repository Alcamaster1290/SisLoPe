import { describe, expect, it } from "vitest";
import {
  createMaritimeFleetHeatmapLayer,
  getFleetHeatmapColor,
} from "@/layers/createMaritimeFleetHeatmapLayer";

describe("createMaritimeFleetHeatmapLayer", () => {
  const cells = [
    {
      cellId: "85754e67fffffff",
      gridSystem: "h3" as const,
      resolution: 5,
      lat: -12.04,
      lon: -77.03,
      geometryBounds: null,
      presenceCount: 12,
      hoursObserved: 4,
      sourceName: "public-demo",
      coverageKind: "mixed" as const,
      qualityBand: "partial" as const,
    },
  ];

  it("crea una capa poligonal visible con las celdas agregadas", () => {
    const layer = createMaritimeFleetHeatmapLayer({
      visible: true,
      viewMode: "standard",
      cells,
    });

    expect(layer.id).toBe("maritime-fleet-heatmap");
    expect(layer.props.visible).toBe(true);
    expect(layer.props.data).toHaveLength(1);
  });

  it("permite mantener la capa apagada sin mutar el resto del pipeline", () => {
    const layer = createMaritimeFleetHeatmapLayer({
      visible: false,
      viewMode: "standard",
      cells: [],
    });

    expect(layer.props.visible).toBe(false);
    expect(layer.props.data).toEqual([]);
  });

  it("filtra celdas H3 invalidas para no romper deck", () => {
    const layer = createMaritimeFleetHeatmapLayer({
      visible: true,
      viewMode: "standard",
      cells: [
        ...cells,
        {
          ...cells[0],
          cellId: "invalid-cell",
        },
      ],
    });

    expect(layer.props.data).toHaveLength(1);
  });

  it("incrementa la intensidad de color cuando sube la presencia", () => {
    const low = getFleetHeatmapColor(
      {
        ...cells[0],
        presenceCount: 2,
      },
      20,
      "standard",
    );
    const high = getFleetHeatmapColor(
      {
        ...cells[0],
        presenceCount: 20,
      },
      20,
      "standard",
    );

    expect(high[0]).toBeGreaterThan(low[0]);
    expect(high[3]).toBeGreaterThan(low[3]);
  });
});
