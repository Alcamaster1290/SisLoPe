import { and, desc, eq, sql } from "drizzle-orm";
import type {
  MaritimeHeatmapCell,
  MaritimeHeatmapCoverage,
  MaritimeHeatmapSnapshot,
  MaritimeHeatmapSnapshotImport,
} from "../contracts/maritimeHeatmap.js";
import type { MaritimeDbLike } from "../plugins/db.js";
import {
  maritimeHeatmapDailyCells,
  maritimeHeatmapRuns,
  maritimeHeatmapSources,
} from "../db/schema/index.js";

interface CreateMaritimeHeatmapRepositoryOptions {
  db: MaritimeDbLike;
}

interface HeatmapRunRecord {
  id: number;
  sourceId: number;
  sourceName: string;
  snapshotDate: string;
  coverageKind: MaritimeHeatmapSnapshot["coverageKind"];
  qualityBand: MaritimeHeatmapSnapshot["qualityBand"];
  note: string | null;
  cellCount: number;
  updatedAt: string;
  finishedAt: string;
}

export interface MaritimeHeatmapRepository {
  ping: () => Promise<void>;
  getLatestSnapshot: () => Promise<MaritimeHeatmapSnapshot | null>;
  getDailySnapshot: (date?: string) => Promise<MaritimeHeatmapSnapshot | null>;
  listCellsForDate: (date?: string) => Promise<MaritimeHeatmapCell[]>;
  getCoverage: () => Promise<MaritimeHeatmapCoverage | null>;
  importSnapshot: (input: MaritimeHeatmapSnapshotImport) => Promise<MaritimeHeatmapSnapshot>;
}

function toSnapshot(run: HeatmapRunRecord): MaritimeHeatmapSnapshot {
  return {
    snapshotDate: run.snapshotDate,
    sourceName: run.sourceName,
    coverageKind: run.coverageKind,
    qualityBand: run.qualityBand,
    coverageNote: run.note,
    cellCount: run.cellCount,
    updatedAt: run.updatedAt || run.finishedAt,
  };
}

function toCoverage(run: HeatmapRunRecord): MaritimeHeatmapCoverage {
  return {
    snapshotDate: run.snapshotDate,
    sourceName: run.sourceName,
    coverageKind: run.coverageKind,
    qualityBand: run.qualityBand,
    coverageNote: run.note,
  };
}

async function readLatestRun(db: MaritimeDbLike): Promise<HeatmapRunRecord | null> {
  const [run] = await db
    .select({
      id: maritimeHeatmapRuns.id,
      sourceId: maritimeHeatmapRuns.sourceId,
      sourceName: maritimeHeatmapRuns.sourceName,
      snapshotDate: maritimeHeatmapRuns.snapshotDate,
      coverageKind: maritimeHeatmapRuns.coverageKind,
      qualityBand: maritimeHeatmapRuns.qualityBand,
      note: maritimeHeatmapRuns.note,
      cellCount: maritimeHeatmapRuns.cellCount,
      updatedAt: maritimeHeatmapRuns.updatedAt,
      finishedAt: maritimeHeatmapRuns.finishedAt,
    })
    .from(maritimeHeatmapRuns)
    .where(eq(maritimeHeatmapRuns.state, "succeeded"))
    .orderBy(desc(maritimeHeatmapRuns.snapshotDate), desc(maritimeHeatmapRuns.finishedAt), desc(maritimeHeatmapRuns.id))
    .limit(1);

  return run ?? null;
}

async function readRunForDate(db: MaritimeDbLike, date: string): Promise<HeatmapRunRecord | null> {
  const [run] = await db
    .select({
      id: maritimeHeatmapRuns.id,
      sourceId: maritimeHeatmapRuns.sourceId,
      sourceName: maritimeHeatmapRuns.sourceName,
      snapshotDate: maritimeHeatmapRuns.snapshotDate,
      coverageKind: maritimeHeatmapRuns.coverageKind,
      qualityBand: maritimeHeatmapRuns.qualityBand,
      note: maritimeHeatmapRuns.note,
      cellCount: maritimeHeatmapRuns.cellCount,
      updatedAt: maritimeHeatmapRuns.updatedAt,
      finishedAt: maritimeHeatmapRuns.finishedAt,
    })
    .from(maritimeHeatmapRuns)
    .where(and(eq(maritimeHeatmapRuns.snapshotDate, date), eq(maritimeHeatmapRuns.state, "succeeded")))
    .orderBy(desc(maritimeHeatmapRuns.finishedAt), desc(maritimeHeatmapRuns.id))
    .limit(1);

  return run ?? null;
}

export function createMaritimeHeatmapRepository({ db }: CreateMaritimeHeatmapRepositoryOptions): MaritimeHeatmapRepository {
  return {
    ping: async () => {
      await db.execute(sql`select 1`);
    },

    getLatestSnapshot: async () => {
      const run = await readLatestRun(db);
      return run ? toSnapshot(run) : null;
    },

    getDailySnapshot: async (date) => {
      const run = date ? await readRunForDate(db, date) : await readLatestRun(db);
      return run ? toSnapshot(run) : null;
    },

    listCellsForDate: async (date) => {
      const run = date ? await readRunForDate(db, date) : await readLatestRun(db);
      if (!run) {
        return [];
      }

      return db
        .select({
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
    },

    getCoverage: async () => {
      const run = await readLatestRun(db);
      return run ? toCoverage(run) : null;
    },

    importSnapshot: async (input) => {
      const now = new Date().toISOString();
      const gridSystem = input.cells[0]?.gridSystem ?? "h3";
      const resolution = input.cells[0]?.resolution ?? 0;

      return db.transaction(async (tx) => {
        const [source] = await tx
          .insert(maritimeHeatmapSources)
          .values({
            sourceName: input.sourceName,
            displayName: input.sourceName,
            defaultCoverageKind: input.coverageKind,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: maritimeHeatmapSources.sourceName,
            set: {
              displayName: input.sourceName,
              defaultCoverageKind: input.coverageKind,
              updatedAt: now,
            },
          })
          .returning({
            id: maritimeHeatmapSources.id,
            sourceName: maritimeHeatmapSources.sourceName,
          });

        if (!source) {
          throw new Error(`No se pudo resolver la fuente de heatmap ${input.sourceName}`);
        }

        const [existingRun] = await tx
          .select({ id: maritimeHeatmapRuns.id })
          .from(maritimeHeatmapRuns)
          .where(
            and(
              eq(maritimeHeatmapRuns.sourceId, source.id),
              eq(maritimeHeatmapRuns.snapshotDate, input.snapshotDate),
            ),
          )
          .limit(1);

        let runId = existingRun?.id ?? null;

        if (runId) {
          await tx.delete(maritimeHeatmapDailyCells).where(eq(maritimeHeatmapDailyCells.runId, runId));

          await tx
            .update(maritimeHeatmapRuns)
            .set({
              sourceName: input.sourceName,
              gridSystem,
              resolution,
              coverageKind: input.coverageKind,
              qualityBand: input.qualityBand,
              note: input.coverageNote ?? null,
              cellCount: input.cells.length,
              state: "succeeded",
              finishedAt: now,
              updatedAt: now,
            })
            .where(eq(maritimeHeatmapRuns.id, runId));
        } else {
          const [run] = await tx
            .insert(maritimeHeatmapRuns)
            .values({
              sourceId: source.id,
              sourceName: input.sourceName,
              snapshotDate: input.snapshotDate,
              state: "succeeded",
              gridSystem,
              resolution,
              coverageKind: input.coverageKind,
              qualityBand: input.qualityBand,
              note: input.coverageNote ?? null,
              cellCount: input.cells.length,
              startedAt: now,
              finishedAt: now,
              updatedAt: now,
            })
            .returning({ id: maritimeHeatmapRuns.id });

          if (!run) {
            throw new Error(`No se pudo crear la corrida de heatmap ${input.snapshotDate}`);
          }

          runId = run.id;
        }

        if (input.cells.length > 0) {
          await tx.insert(maritimeHeatmapDailyCells).values(
            input.cells.map((cell) => ({
              runId,
              sourceId: source.id,
              sourceName: input.sourceName,
              snapshotDate: input.snapshotDate,
              cellId: cell.cellId,
              gridSystem: cell.gridSystem,
              resolution: cell.resolution,
              lat: cell.lat,
              lon: cell.lon,
              geometryBounds: cell.geometryBounds ?? null,
              presenceCount: cell.presenceCount,
              hoursObserved: cell.hoursObserved,
              coverageKind: cell.coverageKind,
              qualityBand: cell.qualityBand,
            })),
          );
        }

        return {
          snapshotDate: input.snapshotDate,
          sourceName: input.sourceName,
          coverageKind: input.coverageKind,
          qualityBand: input.qualityBand,
          coverageNote: input.coverageNote ?? null,
          cellCount: input.cells.length,
          updatedAt: now,
        } satisfies MaritimeHeatmapSnapshot;
      });
    },
  };
}
