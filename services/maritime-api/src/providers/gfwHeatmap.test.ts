import { describe, expect, it } from "vitest";
import {
  aggregatePresenceEntriesToSnapshotImport,
  buildDailyDateRange,
  buildGfwHeatmapReportUrl,
  computeLatestAvailableSnapshotDate,
  extractPresenceEntries,
} from "./gfwHeatmap.js";

describe("gfwHeatmap provider", () => {
  it("calcula la fecha mas reciente disponible con lag de 4 dias", () => {
    const result = computeLatestAvailableSnapshotDate(new Date("2026-03-23T12:00:00.000Z"));

    expect(result).toBe("2026-03-19");
  });

  it("arma el date-range diario usando el dia siguiente como limite superior", () => {
    expect(buildDailyDateRange("2026-03-19")).toBe("2026-03-19,2026-03-20");
  });

  it("arma la URL de 4Wings con dataset y filtro opcional", () => {
    const url = buildGfwHeatmapReportUrl({
      baseUrl: "https://gateway.api.globalfishingwatch.org",
      snapshotDate: "2026-03-19",
      vesselTypes: ["cargo", "tanker"],
      spatialResolution: "LOW",
    });

    expect(url).toContain("datasets%5B0%5D=public-global-presence%3Alatest");
    expect(url).toContain("temporal-resolution=ENTIRE");
    expect(url).toContain("filters%5B0%5D=vessel_type+in+%28%22cargo%22%2C%22tanker%22%29");
  });

  it("extrae las entradas del dataset public-global-presence", () => {
    const entries = extractPresenceEntries({
      entries: [
        {
          "public-global-presence:v3.0": [
            {
              lat: -12.04,
              lon: -77.03,
              hours: 3.5,
              vesselIDs: 2,
            },
          ],
        },
      ],
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.hours).toBe(3.5);
  });

  it("agrega las entradas a celdas H3 y suma horas/presencia", () => {
    const snapshot = aggregatePresenceEntriesToSnapshotImport({
      snapshotDate: "2026-03-19",
      h3Resolution: 5,
      entries: [
        {
          lat: -12.0464,
          lon: -77.0428,
          hours: 4,
          vesselIDs: 2,
        },
        {
          lat: -12.0451,
          lon: -77.0431,
          hours: 6,
          vesselIDs: 3,
        },
      ],
    });

    expect(snapshot.cells).toHaveLength(1);
    expect(snapshot.cells[0]?.presenceCount).toBe(5);
    expect(snapshot.cells[0]?.hoursObserved).toBe(10);
    expect(snapshot.cells[0]?.geometryBounds).not.toBeNull();
  });

  it("filtra celdas fuera del enfoque Peru y clasifica cobertura", () => {
    const snapshot = aggregatePresenceEntriesToSnapshotImport({
      snapshotDate: "2026-03-19",
      h3Resolution: 5,
      entries: [
        {
          lat: -12.0464,
          lon: -77.0428,
          hours: 4,
          vesselIDs: 2,
        },
        {
          lat: -3.75,
          lon: -73.25,
          hours: 3,
          vesselIDs: 1,
        },
        {
          lat: -2.32,
          lon: -79.91,
          hours: 9,
          vesselIDs: 9,
        },
      ],
    });

    expect(snapshot.cells).toHaveLength(2);
    expect(snapshot.cells.some((cell) => cell.coverageKind === "maritime")).toBe(true);
    expect(snapshot.cells.some((cell) => cell.coverageKind === "fluvial")).toBe(true);
    expect(snapshot.cells.every((cell) => cell.lat <= -3.2 || cell.lon > -79.2)).toBe(true);
  });
});
