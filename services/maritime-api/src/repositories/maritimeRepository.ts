import { and, desc, eq, gte, or, sql, type SQL } from "drizzle-orm";
import type {
  BindVesselBody,
  MaritimeAlert,
  MaritimeBindingStatus,
  MaritimeHeatmapCell,
  MaritimeHeatmapCoverage,
  MaritimeHeatmapCoverageKind,
  MaritimeHeatmapQualityBand,
  MaritimeHeatmapSnapshot,
  MaritimeHistoryWindow,
  MaritimeShipmentBinding,
  MaritimeShipmentSummary,
  MaritimeTrackingSnapshot,
  MaritimeVesselLatestEnvelope,
} from "../contracts/maritime.js";
import { HISTORY_WINDOW_MS } from "../contracts/maritime.js";
import type { MaritimeDbLike } from "../plugins/db.js";
import {
  maritimeAlerts,
  maritimeHeatmapDailyCells,
  maritimeHeatmapRuns,
  maritimeHeatmapSources,
  maritimePorts,
  maritimeRefreshRequests,
  maritimeShipments,
  maritimeShipmentVesselAssignments,
  maritimeTrackingCurrent,
  maritimeTrackingSnapshots,
  maritimeVessels,
} from "../db/schema/index.js";

export interface ShipmentRecord {
  id: number;
  shipmentRef: string;
  direction: MaritimeShipmentSummary["direction"];
  shipmentState: MaritimeShipmentSummary["shipmentStatus"];
  destinationName: string | null;
}

export interface ManualRefreshQueuedResult {
  kind: "queued";
  requestId: number;
  queuedAt: string;
}

export interface ManualRefreshCooldownResult {
  kind: "cooldown";
  nextEligibleAt: string;
  retryAfterSec: number;
}

export type ManualRefreshResult = ManualRefreshQueuedResult | ManualRefreshCooldownResult;

export interface MaritimeRepository {
  ping: () => Promise<void>;
  findShipmentByRef: (shipmentRef: string) => Promise<ShipmentRecord | null>;
  getShipmentSummary: (shipment: ShipmentRecord) => Promise<MaritimeShipmentSummary>;
  getBinding: (shipment: ShipmentRecord) => Promise<MaritimeShipmentBinding>;
  getLatestSnapshot: (shipment: ShipmentRecord) => Promise<MaritimeTrackingSnapshot | null>;
  listSnapshots: (
    shipment: ShipmentRecord,
    window: MaritimeHistoryWindow,
  ) => Promise<MaritimeTrackingSnapshot[]>;
  listAlerts: (shipment: ShipmentRecord) => Promise<MaritimeAlert[]>;
  getLatestByVesselImo: (imo: string) => Promise<MaritimeVesselLatestEnvelope>;
  getLatestHeatmapSnapshot: () => Promise<MaritimeHeatmapSnapshot | null>;
  getHeatmapDaily: (date?: string) => Promise<{ snapshot: MaritimeHeatmapSnapshot | null; cells: MaritimeHeatmapCell[] }>;
  getHeatmapCoverage: () => Promise<MaritimeHeatmapCoverage>;
  bindVessel: (shipment: ShipmentRecord, input: BindVesselBody) => Promise<MaritimeShipmentBinding>;
  enqueueManualRefresh: (
    shipment: ShipmentRecord,
    requestedBy: string | undefined,
    note: string | undefined,
    cooldownMs: number,
  ) => Promise<ManualRefreshResult>;
}

interface CreateMaritimeRepositoryOptions {
  db: MaritimeDbLike;
}

interface BindingRow {
  vesselName: string | null;
  imo: string | null;
  mmsi: string | null;
  source: string | null;
  confidence: number | null;
  updatedAt: string | null;
  activeCount: number;
}

interface HeatmapRunRow {
  id: number;
  snapshotDate: string;
  sourceName: string;
  sourceUrl: string | null;
  gridSystem: MaritimeHeatmapSnapshot["gridSystem"];
  resolution: number;
  coverageKind: MaritimeHeatmapCoverageKind;
  qualityBand: MaritimeHeatmapQualityBand;
  cellCount: number;
  note: string | null;
  updatedAt: string;
}

function mapBindingStatus(activeCount: number): MaritimeBindingStatus {
  if (activeCount === 0) {
    return "unbound";
  }

  if (activeCount > 1) {
    return "ambiguous";
  }

  return "bound";
}

function emptyBinding(shipmentRef: string): MaritimeShipmentBinding {
  return {
    shipmentRef,
    status: "unbound",
    vesselName: null,
    imo: null,
    mmsi: null,
    source: null,
    confidence: null,
    updatedAt: null,
  };
}

function toSnapshot(
  shipmentRef: string,
  row: {
    observedAt: string;
    lat: number;
    lon: number;
    vesselName: string | null;
    destinationText: string | null;
    destinationPortCode: string | null;
    destinationPortName: string | null;
    eta: string | null;
    navStatus: string | null;
    sog: number | null;
    cog: number | null;
    signalFreshness: MaritimeTrackingSnapshot["signalFreshness"];
    statusSummary: string;
    providerSource: string | null;
  },
): MaritimeTrackingSnapshot {
  return {
    shipmentRef,
    vesselName: row.vesselName,
    observedAt: row.observedAt,
    position: {
      lat: row.lat,
      lon: row.lon,
    },
    destination: row.destinationText,
    destinationPortCode: row.destinationPortCode,
    destinationPortName: row.destinationPortName,
    eta: row.eta,
    navStatus: row.navStatus,
    sog: row.sog,
    cog: row.cog,
    signalFreshness: row.signalFreshness,
    statusSummary: row.statusSummary,
    providerSource: row.providerSource ?? "unknown",
  };
}

function toHeatmapSnapshot(row: HeatmapRunRow): MaritimeHeatmapSnapshot {
  return {
    snapshotDate: row.snapshotDate,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    gridSystem: row.gridSystem,
    resolution: row.resolution,
    coverageKind: row.coverageKind,
    qualityBand: row.qualityBand,
    cellCount: row.cellCount,
    updatedAt: row.updatedAt,
    note: row.note,
  };
}

function toHeatmapCell(
  row: {
    snapshotDate: string;
    cellId: string;
    gridSystem: MaritimeHeatmapCell["gridSystem"];
    resolution: number;
    lat: number;
    lon: number;
    geometryBounds: MaritimeHeatmapCell["geometryBounds"];
    presenceCount: number;
    hoursObserved: number;
    sourceName: string;
    coverageKind: MaritimeHeatmapCoverageKind;
    qualityBand: MaritimeHeatmapQualityBand;
  },
): MaritimeHeatmapCell {
  return {
    snapshotDate: row.snapshotDate,
    cellId: row.cellId,
    gridSystem: row.gridSystem,
    resolution: row.resolution,
    center: {
      lat: row.lat,
      lon: row.lon,
    },
    geometryBounds: row.geometryBounds,
    presenceCount: row.presenceCount,
    hoursObserved: row.hoursObserved,
    sourceName: row.sourceName,
    coverageKind: row.coverageKind,
    qualityBand: row.qualityBand,
  };
}

function emptyHeatmapCoverage(): MaritimeHeatmapCoverage {
  return {
    snapshotDate: null,
    sourceName: null,
    sourceUrl: null,
    coverageKind: null,
    qualityBand: null,
    note: null,
    disclaimer: "Cobertura referencial, parcial en corredores fluviales.",
    lastSuccessfulRunAt: null,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createMaritimeRepository({
  db,
}: CreateMaritimeRepositoryOptions): MaritimeRepository {
  async function readBindingRows(shipmentId: number): Promise<BindingRow[]> {
    const rows = await db
      .select({
        vesselName: maritimeVessels.vesselName,
        imo: maritimeVessels.imo,
        mmsi: maritimeVessels.mmsi,
        source: maritimeShipmentVesselAssignments.source,
        confidence: maritimeShipmentVesselAssignments.confidence,
        updatedAt: maritimeShipmentVesselAssignments.updatedAt,
      })
      .from(maritimeShipmentVesselAssignments)
      .leftJoin(maritimeVessels, eq(maritimeShipmentVesselAssignments.vesselId, maritimeVessels.id))
      .where(
        and(
          eq(maritimeShipmentVesselAssignments.shipmentId, shipmentId),
          eq(maritimeShipmentVesselAssignments.isActive, true),
        ),
      )
      .orderBy(desc(maritimeShipmentVesselAssignments.updatedAt));

    return rows.map((row) => ({
      vesselName: row.vesselName,
      imo: row.imo,
      mmsi: row.mmsi,
      source: row.source,
      confidence: row.confidence,
      updatedAt: row.updatedAt,
      activeCount: rows.length,
    }));
  }

  async function readBinding(shipment: ShipmentRecord): Promise<MaritimeShipmentBinding> {
    const rows = await readBindingRows(shipment.id);
    const first = rows[0];

    if (!first) {
      return emptyBinding(shipment.shipmentRef);
    }

    return {
      shipmentRef: shipment.shipmentRef,
      status: mapBindingStatus(first.activeCount),
      vesselName: first.vesselName,
      imo: first.imo,
      mmsi: first.mmsi,
      source: first.source,
      confidence: first.confidence,
      updatedAt: first.updatedAt,
    };
  }

  async function readCurrentRow(shipmentId: number) {
    const [row] = await db
      .select({
        trackingStatus: maritimeTrackingCurrent.trackingStatus,
        signalFreshness: maritimeTrackingCurrent.signalFreshness,
        lastObservedAt: maritimeTrackingCurrent.lastObservedAt,
        lastSyncedAt: maritimeTrackingCurrent.lastSyncedAt,
        lat: maritimeTrackingCurrent.lat,
        lon: maritimeTrackingCurrent.lon,
        sog: maritimeTrackingCurrent.sog,
        cog: maritimeTrackingCurrent.cog,
        navStatus: maritimeTrackingCurrent.navStatus,
        eta: maritimeTrackingCurrent.eta,
        destinationText: maritimeTrackingCurrent.destinationText,
        statusSummary: maritimeTrackingCurrent.statusSummary,
        providerSource: maritimeTrackingCurrent.providerSource,
        destinationPortCode: maritimePorts.unlocode,
        destinationPortName: maritimePorts.portName,
      })
      .from(maritimeTrackingCurrent)
      .leftJoin(maritimePorts, eq(maritimeTrackingCurrent.destinationPortId, maritimePorts.id))
      .where(eq(maritimeTrackingCurrent.shipmentId, shipmentId))
      .limit(1);

    return row ?? null;
  }

  async function readLatestHeatmapRun(date?: string): Promise<HeatmapRunRow | null> {
    const query = db
      .select({
        id: maritimeHeatmapRuns.id,
        snapshotDate: maritimeHeatmapRuns.snapshotDate,
        sourceName: maritimeHeatmapSources.sourceName,
        sourceUrl: maritimeHeatmapSources.sourceUrl,
        gridSystem: maritimeHeatmapRuns.gridSystem,
        resolution: maritimeHeatmapRuns.resolution,
        coverageKind: maritimeHeatmapRuns.coverageKind,
        qualityBand: maritimeHeatmapRuns.qualityBand,
        cellCount: maritimeHeatmapRuns.cellCount,
        note: maritimeHeatmapRuns.note,
        updatedAt: maritimeHeatmapRuns.updatedAt,
      })
      .from(maritimeHeatmapRuns)
      .innerJoin(maritimeHeatmapSources, eq(maritimeHeatmapRuns.sourceId, maritimeHeatmapSources.id))
      .where(
        and(
          eq(maritimeHeatmapRuns.state, "succeeded"),
          date ? eq(maritimeHeatmapRuns.snapshotDate, date) : undefined,
        ),
      )
      .orderBy(desc(maritimeHeatmapRuns.snapshotDate), desc(maritimeHeatmapRuns.finishedAt), desc(maritimeHeatmapRuns.id))
      .limit(1);

    const [row] = await query;
    return row ?? null;
  }

  return {
    ping: async () => {
      await db.execute(sql`select 1`);
    },

    findShipmentByRef: async (shipmentRef) => {
      const [row] = await db
        .select({
          id: maritimeShipments.id,
          shipmentRef: maritimeShipments.shipmentRef,
          direction: maritimeShipments.direction,
          shipmentState: maritimeShipments.shipmentState,
          destinationName: maritimeShipments.destinationName,
        })
        .from(maritimeShipments)
        .where(eq(maritimeShipments.shipmentRef, shipmentRef))
        .limit(1);

      return row ?? null;
    },

    getBinding: async (shipment) => readBinding(shipment),

    getShipmentSummary: async (shipment) => {
      const [bindingRows, current, alertCountResult] = await Promise.all([
        readBindingRows(shipment.id),
        readCurrentRow(shipment.id),
        db
          .select({
            count: sql<number>`count(*)::int`,
          })
          .from(maritimeAlerts)
          .where(
            and(eq(maritimeAlerts.shipmentId, shipment.id), eq(maritimeAlerts.state, "open")),
          ),
      ]);

      const binding = bindingRows[0] ?? null;
      const alertCount = alertCountResult[0]?.count ?? 0;

      return {
        shipmentRef: shipment.shipmentRef,
        direction: shipment.direction,
        shipmentStatus: shipment.shipmentState,
        trackingStatus: (current?.trackingStatus ?? "empty") as MaritimeShipmentSummary["trackingStatus"],
        bindingStatus: mapBindingStatus(bindingRows.length),
        vesselName: binding?.vesselName ?? null,
        imo: binding?.imo ?? null,
        mmsi: binding?.mmsi ?? null,
        destination: current?.destinationText ?? shipment.destinationName ?? null,
        eta: current?.eta ?? null,
        statusSummary: current?.statusSummary ?? "Sin tracking disponible",
        lastObservedAt: current?.lastObservedAt ?? null,
        lastSyncedAt: current?.lastSyncedAt ?? null,
        latestPosition:
          current?.lat != null && current.lon != null
            ? {
                lat: current.lat,
                lon: current.lon,
              }
            : null,
        alertCount,
      };
    },

    getLatestSnapshot: async (shipment) => {
      const [snapshot] = await db
        .select({
          observedAt: maritimeTrackingSnapshots.observedAt,
          lat: maritimeTrackingSnapshots.lat,
          lon: maritimeTrackingSnapshots.lon,
          vesselName: maritimeVessels.vesselName,
          destinationText: maritimeTrackingSnapshots.destinationText,
          destinationPortCode: maritimePorts.unlocode,
          destinationPortName: maritimePorts.portName,
          eta: maritimeTrackingSnapshots.eta,
          navStatus: maritimeTrackingSnapshots.navStatus,
          sog: maritimeTrackingSnapshots.sog,
          cog: maritimeTrackingSnapshots.cog,
          signalFreshness: maritimeTrackingSnapshots.signalFreshness,
          statusSummary: maritimeTrackingSnapshots.statusSummary,
          providerSource: maritimeTrackingSnapshots.providerSource,
        })
        .from(maritimeTrackingSnapshots)
        .leftJoin(maritimeVessels, eq(maritimeTrackingSnapshots.vesselId, maritimeVessels.id))
        .leftJoin(maritimePorts, eq(maritimeTrackingSnapshots.destinationPortId, maritimePorts.id))
        .where(eq(maritimeTrackingSnapshots.shipmentId, shipment.id))
        .orderBy(desc(maritimeTrackingSnapshots.observedAt))
        .limit(1);

      if (snapshot) {
        return toSnapshot(shipment.shipmentRef, snapshot);
      }

      const current = await readCurrentRow(shipment.id);
      const binding = await readBinding(shipment);

      if (!current || current.lat == null || current.lon == null || !current.lastObservedAt) {
        return null;
      }

      return toSnapshot(shipment.shipmentRef, {
        observedAt: current.lastObservedAt,
        lat: current.lat,
        lon: current.lon,
        vesselName: binding.vesselName,
        destinationText: current.destinationText,
        destinationPortCode: current.destinationPortCode,
        destinationPortName: current.destinationPortName,
        eta: current.eta,
        navStatus: current.navStatus,
        sog: current.sog,
        cog: current.cog,
        signalFreshness: current.signalFreshness as MaritimeTrackingSnapshot["signalFreshness"],
        statusSummary: current.statusSummary,
        providerSource: current.providerSource,
      });
    },

    listSnapshots: async (shipment, window) => {
      const cutoff = new Date(Date.now() - HISTORY_WINDOW_MS[window]).toISOString();

      const rows = await db
        .select({
          observedAt: maritimeTrackingSnapshots.observedAt,
          lat: maritimeTrackingSnapshots.lat,
          lon: maritimeTrackingSnapshots.lon,
          vesselName: maritimeVessels.vesselName,
          destinationText: maritimeTrackingSnapshots.destinationText,
          destinationPortCode: maritimePorts.unlocode,
          destinationPortName: maritimePorts.portName,
          eta: maritimeTrackingSnapshots.eta,
          navStatus: maritimeTrackingSnapshots.navStatus,
          sog: maritimeTrackingSnapshots.sog,
          cog: maritimeTrackingSnapshots.cog,
          signalFreshness: maritimeTrackingSnapshots.signalFreshness,
          statusSummary: maritimeTrackingSnapshots.statusSummary,
          providerSource: maritimeTrackingSnapshots.providerSource,
        })
        .from(maritimeTrackingSnapshots)
        .leftJoin(maritimeVessels, eq(maritimeTrackingSnapshots.vesselId, maritimeVessels.id))
        .leftJoin(maritimePorts, eq(maritimeTrackingSnapshots.destinationPortId, maritimePorts.id))
        .where(
          and(
            eq(maritimeTrackingSnapshots.shipmentId, shipment.id),
            gte(maritimeTrackingSnapshots.observedAt, cutoff),
          ),
        )
        .orderBy(desc(maritimeTrackingSnapshots.observedAt));

      return rows.map((row): MaritimeTrackingSnapshot => toSnapshot(shipment.shipmentRef, row));
    },

    listAlerts: async (shipment) => {
      const rows = await db
        .select({
          id: maritimeAlerts.id,
          type: maritimeAlerts.alertType,
          severity: maritimeAlerts.severity,
          state: maritimeAlerts.state,
          title: maritimeAlerts.title,
          message: maritimeAlerts.message,
          detectedAt: maritimeAlerts.detectedAt,
          resolvedAt: maritimeAlerts.resolvedAt,
        })
        .from(maritimeAlerts)
        .where(eq(maritimeAlerts.shipmentId, shipment.id))
        .orderBy(desc(maritimeAlerts.detectedAt));

      return rows.map((row): MaritimeAlert => ({
        id: String(row.id),
        shipmentRef: shipment.shipmentRef,
        type: row.type,
        severity: row.severity,
        state: row.state,
        title: row.title,
        message: row.message,
        detectedAt: row.detectedAt,
        resolvedAt: row.resolvedAt,
      }));
    },

    getLatestByVesselImo: async (imo) => {
      const [vessel] = await db
        .select({
          id: maritimeVessels.id,
        })
        .from(maritimeVessels)
        .where(eq(maritimeVessels.imo, imo))
        .limit(1);

      if (!vessel) {
        return {
          status: "empty",
          shipmentRef: null,
          snapshot: null,
        };
      }

      const [current] = await db
        .select({
          shipmentRef: maritimeShipments.shipmentRef,
          observedAt: maritimeTrackingCurrent.lastObservedAt,
          lat: maritimeTrackingCurrent.lat,
          lon: maritimeTrackingCurrent.lon,
          vesselName: maritimeVessels.vesselName,
          destinationText: maritimeTrackingCurrent.destinationText,
          destinationPortCode: maritimePorts.unlocode,
          destinationPortName: maritimePorts.portName,
          eta: maritimeTrackingCurrent.eta,
          navStatus: maritimeTrackingCurrent.navStatus,
          sog: maritimeTrackingCurrent.sog,
          cog: maritimeTrackingCurrent.cog,
          signalFreshness: maritimeTrackingCurrent.signalFreshness,
          statusSummary: maritimeTrackingCurrent.statusSummary,
          providerSource: maritimeTrackingCurrent.providerSource,
        })
        .from(maritimeTrackingCurrent)
        .leftJoin(maritimeShipments, eq(maritimeTrackingCurrent.shipmentId, maritimeShipments.id))
        .leftJoin(maritimeVessels, eq(maritimeTrackingCurrent.vesselId, maritimeVessels.id))
        .leftJoin(maritimePorts, eq(maritimeTrackingCurrent.destinationPortId, maritimePorts.id))
        .where(eq(maritimeTrackingCurrent.vesselId, vessel.id))
        .orderBy(desc(maritimeTrackingCurrent.lastObservedAt))
        .limit(1);

      if (!current || !current.shipmentRef || !current.observedAt || current.lat == null || current.lon == null) {
        return {
          status: "empty",
          shipmentRef: null,
          snapshot: null,
        };
      }

      const snapshot = toSnapshot(current.shipmentRef, {
        observedAt: current.observedAt,
        lat: current.lat,
        lon: current.lon,
        vesselName: current.vesselName,
        destinationText: current.destinationText,
        destinationPortCode: current.destinationPortCode,
        destinationPortName: current.destinationPortName,
        eta: current.eta,
        navStatus: current.navStatus,
        sog: current.sog,
        cog: current.cog,
        signalFreshness: current.signalFreshness as MaritimeTrackingSnapshot["signalFreshness"],
        statusSummary: current.statusSummary,
        providerSource: current.providerSource,
      });

      return {
        status: snapshot.signalFreshness === "lost" ? "degraded" : "ready",
        shipmentRef: current.shipmentRef,
        snapshot,
      };
    },

    getLatestHeatmapSnapshot: async () => {
      const row = await readLatestHeatmapRun();
      return row ? toHeatmapSnapshot(row) : null;
    },

    getHeatmapDaily: async (date) => {
      const run = await readLatestHeatmapRun(date);
      if (!run) {
        return {
          snapshot: null,
          cells: [],
        };
      }

      const rows = await db
        .select({
          snapshotDate: maritimeHeatmapDailyCells.snapshotDate,
          cellId: maritimeHeatmapDailyCells.cellId,
          gridSystem: maritimeHeatmapDailyCells.gridSystem,
          resolution: maritimeHeatmapDailyCells.resolution,
          lat: maritimeHeatmapDailyCells.lat,
          lon: maritimeHeatmapDailyCells.lon,
          geometryBounds: maritimeHeatmapDailyCells.geometryBounds,
          presenceCount: maritimeHeatmapDailyCells.presenceCount,
          hoursObserved: maritimeHeatmapDailyCells.hoursObserved,
          sourceName: maritimeHeatmapDailyCells.sourceName,
          coverageKind: maritimeHeatmapDailyCells.coverageKind,
          qualityBand: maritimeHeatmapDailyCells.qualityBand,
        })
        .from(maritimeHeatmapDailyCells)
        .where(eq(maritimeHeatmapDailyCells.runId, run.id))
        .orderBy(desc(maritimeHeatmapDailyCells.presenceCount), maritimeHeatmapDailyCells.cellId);

      return {
        snapshot: toHeatmapSnapshot(run),
        cells: rows.map((row) => toHeatmapCell(row)),
      };
    },

    getHeatmapCoverage: async () => {
      const run = await readLatestHeatmapRun();
      if (!run) {
        return emptyHeatmapCoverage();
      }

      return {
        snapshotDate: run.snapshotDate,
        sourceName: run.sourceName,
        sourceUrl: run.sourceUrl,
        coverageKind: run.coverageKind,
        qualityBand: run.qualityBand,
        note: run.note,
        disclaimer: "Cobertura referencial, parcial en corredores fluviales.",
        lastSuccessfulRunAt: run.updatedAt,
      };
    },

    bindVessel: async (shipment, input) => {
      const timestamp = nowIso();

      return db.transaction(async (tx: MaritimeDbLike) => {
        const predicates: SQL[] = [];
        if (input.imo) {
          predicates.push(eq(maritimeVessels.imo, input.imo));
        }
        if (input.mmsi) {
          predicates.push(eq(maritimeVessels.mmsi, input.mmsi));
        }

        const matchCondition = predicates.length === 1 ? predicates[0] : or(...predicates)!;
        const existingCandidates = await tx
          .select({
            id: maritimeVessels.id,
            vesselName: maritimeVessels.vesselName,
            imo: maritimeVessels.imo,
            mmsi: maritimeVessels.mmsi,
          })
          .from(maritimeVessels)
          .where(matchCondition);

        let vessel = existingCandidates[0];

        if (vessel) {
          const [updatedVessel] = await tx
            .update(maritimeVessels)
            .set({
              vesselName: input.vesselName ?? vessel.vesselName,
              imo: input.imo ?? vessel.imo,
              mmsi: input.mmsi ?? vessel.mmsi,
              updatedAt: timestamp,
            })
            .where(eq(maritimeVessels.id, vessel.id))
            .returning({
              id: maritimeVessels.id,
              vesselName: maritimeVessels.vesselName,
              imo: maritimeVessels.imo,
              mmsi: maritimeVessels.mmsi,
            });

          vessel = updatedVessel;
        } else {
          const [createdVessel] = await tx
            .insert(maritimeVessels)
            .values({
              vesselName: input.vesselName ?? input.imo ?? input.mmsi ?? `shipment-${shipment.shipmentRef}`,
              imo: input.imo ?? null,
              mmsi: input.mmsi ?? null,
              updatedAt: timestamp,
            })
            .returning({
              id: maritimeVessels.id,
              vesselName: maritimeVessels.vesselName,
              imo: maritimeVessels.imo,
              mmsi: maritimeVessels.mmsi,
            });

          vessel = createdVessel;
        }

        if (!vessel) {
          throw new Error(`No fue posible resolver el buque para ${shipment.shipmentRef}`);
        }

        await tx
          .update(maritimeShipmentVesselAssignments)
          .set({
            isActive: false,
            validTo: timestamp,
            updatedAt: timestamp,
          })
          .where(
            and(
              eq(maritimeShipmentVesselAssignments.shipmentId, shipment.id),
              eq(maritimeShipmentVesselAssignments.isActive, true),
            ),
          );

        await tx.insert(maritimeShipmentVesselAssignments).values({
          shipmentId: shipment.id,
          vesselId: vessel.id,
          source: input.source,
          confidence: input.confidence ?? null,
          metadata: input.metadata ?? null,
          updatedAt: timestamp,
          validFrom: timestamp,
        });

        const rows = await tx
          .select({
            vesselName: maritimeVessels.vesselName,
            imo: maritimeVessels.imo,
            mmsi: maritimeVessels.mmsi,
            source: maritimeShipmentVesselAssignments.source,
            confidence: maritimeShipmentVesselAssignments.confidence,
            updatedAt: maritimeShipmentVesselAssignments.updatedAt,
          })
          .from(maritimeShipmentVesselAssignments)
          .leftJoin(maritimeVessels, eq(maritimeShipmentVesselAssignments.vesselId, maritimeVessels.id))
          .where(
            and(
              eq(maritimeShipmentVesselAssignments.shipmentId, shipment.id),
              eq(maritimeShipmentVesselAssignments.isActive, true),
            ),
          );

        const first = rows[0];

        if (!first) {
          return emptyBinding(shipment.shipmentRef);
        }

        return {
          shipmentRef: shipment.shipmentRef,
          status: mapBindingStatus(rows.length),
          vesselName: first.vesselName,
          imo: first.imo,
          mmsi: first.mmsi,
          source: first.source,
          confidence: first.confidence,
          updatedAt: first.updatedAt,
        } satisfies MaritimeShipmentBinding;
      });
    },

    enqueueManualRefresh: async (shipment, requestedBy, note, cooldownMs) => {
      const [latestRequest] = await db
        .select({
          requestedAt: maritimeRefreshRequests.requestedAt,
        })
        .from(maritimeRefreshRequests)
        .where(eq(maritimeRefreshRequests.shipmentId, shipment.id))
        .orderBy(desc(maritimeRefreshRequests.requestedAt))
        .limit(1);

      if (latestRequest?.requestedAt) {
        const nextEligible = new Date(new Date(latestRequest.requestedAt).getTime() + cooldownMs);
        const retryAfterMs = nextEligible.getTime() - Date.now();

        if (retryAfterMs > 0) {
          return {
            kind: "cooldown",
            nextEligibleAt: nextEligible.toISOString(),
            retryAfterSec: Math.ceil(retryAfterMs / 1000),
          };
        }
      }

      const [request] = await db
        .insert(maritimeRefreshRequests)
        .values({
          shipmentId: shipment.id,
          requestSource: "manual",
          requestedBy: requestedBy ?? null,
          note: note ?? null,
          state: "pending",
        })
        .returning({
          id: maritimeRefreshRequests.id,
          requestedAt: maritimeRefreshRequests.requestedAt,
        });

      if (!request) {
        throw new Error(`No fue posible encolar refresh para ${shipment.shipmentRef}`);
      }

      return {
        kind: "queued",
        requestId: request.id,
        queuedAt: request.requestedAt,
      };
    },
  };
}


