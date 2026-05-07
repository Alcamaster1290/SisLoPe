import { booleanPointInPolygon, buffer, point as turfPoint } from "@turf/turf";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { describe, expect, it } from "vitest";
import { nodes } from "@/data/nodes";
import peruBoundary from "@/data/peruBoundary";

const PERU_BOUNDARY_TOLERANCE_KM = 10;

describe("nodes geospatial placement", () => {
  it("places Santa Rosa at the Tacna border complex, not Chacalluta airport", () => {
    const santaRosa = nodes.find((node) => node.id === "santa-rosa");

    expect(santaRosa).toBeDefined();
    expect(santaRosa?.region).toBe("Tacna");
    expect(santaRosa?.lat).toBeCloseTo(-18.30721, 4);
    expect(santaRosa?.lon).toBeCloseTo(-70.31449, 4);
  });

  it("keeps La Tina and Kasani on the Peru-side control points", () => {
    const laTina = nodes.find((node) => node.id === "la-tina");
    const aduanaLaTina = nodes.find((node) => node.id === "aduana-la-tina");
    const kasani = nodes.find((node) => node.id === "kasani");

    expect(laTina?.region).toBe("Piura");
    expect(laTina?.lat).toBeCloseTo(-4.3924646, 4);
    expect(laTina?.lon).toBeCloseTo(-79.9661874, 4);
    expect(aduanaLaTina?.lat).toBeCloseTo(-4.3923982, 4);
    expect(aduanaLaTina?.lon).toBeCloseTo(-79.9660719, 4);
    expect(kasani?.region).toBe("Puno");
    expect(kasani?.lat).toBeCloseTo(-16.2267014, 4);
    expect(kasani?.lon).toBeCloseTo(-69.0954432, 4);
  });

  it("anchors corrected seaports to terminal or harbour master objects", () => {
    const expectedPortCoordinates = new Map([
      ["callao", [-12.0510604, -77.1457171]],
      ["chancay", [-11.5922989, -77.2800097]],
      ["paita", [-5.0830285, -81.1063466]],
      ["talara", [-4.5769472, -81.2802052]],
      ["bayovar", [-5.7983065, -81.0513131]],
      ["eten", [-6.9357781, -79.8683267]],
      ["salaverry", [-8.232145, -78.9807666]],
      ["pacasmayo", [-7.3981947, -79.5734335]],
      ["chimbote", [-9.0749813, -78.606215]],
      ["huarmey", [-10.1032782, -78.1789965]],
      ["general-san-martin", [-13.8026159, -76.2925897]],
      ["marcona", [-15.3625545, -75.1661988]],
      ["melchorita", [-13.2441865, -76.2976204]],
      ["matarani", [-16.9975739, -72.1036668]],
      ["mollendo", [-17.0304821, -72.0156227]],
      ["ilo", [-17.6437539, -71.3458775]],
    ]);

    for (const [nodeId, [lat, lon]] of expectedPortCoordinates) {
      const node = nodes.find((entry) => entry.id === nodeId);

      expect(node?.lat).toBeCloseTo(lat, 4);
      expect(node?.lon).toBeCloseTo(lon, 4);
    }
  });

  it("keeps key customs and border control nodes represented", () => {
    const nodeIds = new Set(nodes.map((node) => node.id));

    expect(Array.from(nodeIds)).toEqual(
      expect.arrayContaining([
        "alamor",
        "la-balsa",
        "aduana-arequipa",
        "aduana-desaguadero",
        "aduana-santa-rosa",
      ]),
    );
  });

  it("keeps nodes inside Peru geometry or close to the national boundary", () => {
    const peruFeature = peruBoundary.features[0] as unknown as Feature<Polygon | MultiPolygon>;
    const bufferedPeru = buffer(peruFeature, PERU_BOUNDARY_TOLERANCE_KM, { units: "kilometers" });

    const outliers = nodes
      .map((node) => {
        const point = turfPoint([node.lon, node.lat]);
        const inside = bufferedPeru ? booleanPointInPolygon(point, bufferedPeru) : false;
        return {
          id: node.id,
          insideBufferedBoundary: inside,
        };
      })
      .filter((entry) => !entry.insideBufferedBoundary);

    expect(outliers).toEqual([]);
  });
});
