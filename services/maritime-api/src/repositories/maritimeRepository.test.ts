import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { describe, expect, it } from "vitest";
import * as schema from "../db/schema/index.js";
import { createMaritimeRepository } from "./maritimeRepository.js";

async function createTestDb() {
  const client = new PGlite();
  const migrationDir = join(dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");
  const migrationFiles = readdirSync(migrationDir)
    .filter((entry) => entry.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const sqlText = readFileSync(join(migrationDir, file), "utf8");
    for (const statement of sqlText
      .split("--> statement-breakpoint")
      .map((chunk) => chunk.trim())
      .filter(Boolean)) {
      await client.exec(statement);
    }
  }

  const db = drizzle(client, { schema });
  return { client, db };
}

describe("createMaritimeRepository", () => {
  it("arma summary y latest snapshot desde tablas nuevas", async () => {
    const { client, db } = await createTestDb();
    const repository = createMaritimeRepository({ db: db as never });

    const [shipment] = await db
      .insert(schema.maritimeShipments)
      .values({
        shipmentRef: "SHP-001",
        direction: "import",
        destinationName: "Callao",
        shipmentState: "in_transit",
      })
      .returning({ id: schema.maritimeShipments.id });

    const [vessel] = await db
      .insert(schema.maritimeVessels)
      .values({
        imo: "9387421",
        mmsi: "123456789",
        vesselName: "Andes Carrier",
      })
      .returning({ id: schema.maritimeVessels.id });

    const [port] = await db
      .insert(schema.maritimePorts)
      .values({
        unlocode: "PECLL",
        portName: "Callao",
      })
      .returning({ id: schema.maritimePorts.id });

    await db.insert(schema.maritimeShipmentVesselAssignments).values({
      shipmentId: shipment.id,
      vesselId: vessel.id,
      source: "ops",
      confidence: 0.95,
    });

    const [snapshot] = await db
      .insert(schema.maritimeTrackingSnapshots)
      .values({
        shipmentId: shipment.id,
        vesselId: vessel.id,
        observedAt: "2026-03-22T10:00:00.000Z",
        lat: -12.04,
        lon: -77.03,
        signalFreshness: "fresh",
        statusSummary: "En ruta",
        providerSource: "mock",
        destinationText: "Callao",
        destinationPortId: port.id,
      })
      .returning({ id: schema.maritimeTrackingSnapshots.id });

    await db.insert(schema.maritimeTrackingCurrent).values({
      shipmentId: shipment.id,
      vesselId: vessel.id,
      latestSnapshotId: snapshot.id,
      trackingStatus: "ready",
      signalFreshness: "fresh",
      lastObservedAt: "2026-03-22T10:00:00.000Z",
      lastSyncedAt: "2026-03-22T10:05:00.000Z",
      lat: -12.04,
      lon: -77.03,
      statusSummary: "En ruta",
      providerSource: "mock",
      destinationText: "Callao",
      destinationPortId: port.id,
    });

    await db.insert(schema.maritimeAlerts).values({
      shipmentId: shipment.id,
      vesselId: vessel.id,
      alertType: "eta_change",
      severity: "warning",
      state: "open",
      title: "ETA ajustada",
      message: "Cambio operativo",
      detectedAt: "2026-03-22T10:06:00.000Z",
    });

    const shipmentRecord = await repository.findShipmentByRef("SHP-001");
    expect(shipmentRecord).not.toBeNull();

    const summary = await repository.getShipmentSummary(shipmentRecord!);
    const latest = await repository.getLatestSnapshot(shipmentRecord!);
    const alerts = await repository.listAlerts(shipmentRecord!);

    expect(summary.shipmentRef).toBe("SHP-001");
    expect(summary.alertCount).toBe(1);
    expect(summary.bindingStatus).toBe("bound");
    expect(latest?.destinationPortCode).toBe("PECLL");
    expect(alerts).toHaveLength(1);

    await client.close();
  }, 15_000);

  it("devuelve heatmap latest, daily y coverage", async () => {
    const { client, db } = await createTestDb();
    const repository = createMaritimeRepository({ db: db as never });

    const [source] = await db
      .insert(schema.maritimeHeatmapSources)
      .values({
        sourceName: "public-demo",
        displayName: "Public demo",
        sourceUrl: "https://example.test/heatmap.json",
        notes: "Capa referencial.",
      })
      .returning({ id: schema.maritimeHeatmapSources.id });

    const [run] = await db
      .insert(schema.maritimeHeatmapRuns)
      .values({
        sourceId: source.id,
        sourceName: "public-demo",
        snapshotDate: "2026-03-22",
        gridSystem: "h3",
        resolution: 5,
        coverageKind: "mixed",
        qualityBand: "partial",
        state: "succeeded",
        note: "Cobertura parcial.",
        cellCount: 2,
        finishedAt: "2026-03-22T02:00:00.000Z",
      })
      .returning({ id: schema.maritimeHeatmapRuns.id });

    await db.insert(schema.maritimeHeatmapDailyCells).values([
      {
        runId: run.id,
        sourceId: source.id,
        snapshotDate: "2026-03-22",
        cellId: "85754e67fffffff",
        gridSystem: "h3",
        resolution: 5,
        lat: -12.04,
        lon: -77.03,
        presenceCount: 12,
        hoursObserved: 4,
        sourceName: "public-demo",
        coverageKind: "maritime",
        qualityBand: "partial",
      },
      {
        runId: run.id,
        sourceId: source.id,
        snapshotDate: "2026-03-22",
        cellId: "85754e2bfffffff",
        gridSystem: "h3",
        resolution: 5,
        lat: -3.75,
        lon: -73.25,
        presenceCount: 5,
        hoursObserved: 2,
        sourceName: "public-demo",
        coverageKind: "fluvial",
        qualityBand: "partial",
      },
    ]);

    const latest = await repository.getLatestHeatmapSnapshot();
    const daily = await repository.getHeatmapDaily();
    const coverage = await repository.getHeatmapCoverage();

    expect(latest?.snapshotDate).toBe("2026-03-22");
    expect(daily.snapshot?.sourceName).toBe("public-demo");
    expect(daily.cells).toHaveLength(2);
    expect(daily.cells[0]?.presenceCount).toBe(12);
    expect(coverage.coverageKind).toBe("mixed");
    expect(coverage.disclaimer).toMatch(/parcial/i);

    await client.close();
  }, 15_000);

  it("encola manual refresh y aplica cooldown", async () => {
    const { client, db } = await createTestDb();
    const repository = createMaritimeRepository({ db: db as never });

    const [shipment] = await db
      .insert(schema.maritimeShipments)
      .values({
        shipmentRef: "SHP-002",
        shipmentState: "planned",
      })
      .returning({
        id: schema.maritimeShipments.id,
        shipmentRef: schema.maritimeShipments.shipmentRef,
        direction: schema.maritimeShipments.direction,
        shipmentState: schema.maritimeShipments.shipmentState,
        destinationName: schema.maritimeShipments.destinationName,
      });

    const first = await repository.enqueueManualRefresh(shipment, "ops", "manual", 900_000);
    const second = await repository.enqueueManualRefresh(shipment, "ops", "manual", 900_000);

    expect(first.kind).toBe("queued");
    expect(second.kind).toBe("cooldown");

    await client.close();
  }, 15_000);
});
