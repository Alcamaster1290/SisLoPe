import { z } from "zod";

export type MaritimeHeatmapGridSystem = "h3";
export type MaritimeHeatmapCoverageKind = "maritime" | "fluvial" | "mixed";
export type MaritimeHeatmapQualityBand = "high" | "medium" | "partial";
export type MaritimeHeatmapReadStatus = "ready" | "empty";

export interface MaritimeHeatmapGeometryBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface MaritimeHeatmapCell {
  cellId: string;
  gridSystem: MaritimeHeatmapGridSystem;
  resolution: number;
  lat: number;
  lon: number;
  geometryBounds: MaritimeHeatmapGeometryBounds | null;
  presenceCount: number;
  hoursObserved: number;
  sourceName: string;
  coverageKind: MaritimeHeatmapCoverageKind;
  qualityBand: MaritimeHeatmapQualityBand;
}

export interface MaritimeHeatmapSnapshot {
  snapshotDate: string;
  sourceName: string;
  coverageKind: MaritimeHeatmapCoverageKind;
  qualityBand: MaritimeHeatmapQualityBand;
  coverageNote: string | null;
  cellCount: number;
  updatedAt: string;
}

export interface MaritimeHeatmapCoverage {
  snapshotDate: string;
  sourceName: string;
  coverageKind: MaritimeHeatmapCoverageKind;
  qualityBand: MaritimeHeatmapQualityBand;
  coverageNote: string | null;
}

export interface MaritimeHeatmapLatestEnvelope {
  status: MaritimeHeatmapReadStatus;
  snapshot: MaritimeHeatmapSnapshot | null;
}

export interface MaritimeHeatmapDailyEnvelope {
  status: MaritimeHeatmapReadStatus;
  snapshot: MaritimeHeatmapSnapshot | null;
  cells: MaritimeHeatmapCell[];
}

export interface MaritimeHeatmapCoverageEnvelope {
  status: MaritimeHeatmapReadStatus;
  coverage: MaritimeHeatmapCoverage | null;
}

export interface MaritimeHeatmapSnapshotImport {
  snapshotDate: string;
  sourceName: string;
  coverageKind: MaritimeHeatmapCoverageKind;
  qualityBand: MaritimeHeatmapQualityBand;
  coverageNote?: string | null;
  cells: MaritimeHeatmapCell[];
}

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Usa formato YYYY-MM-DD");

export const heatmapDailyQuerySchema = z.object({
  date: isoDateSchema.optional(),
});

export const heatmapSnapshotImportSchema = z.object({
  snapshotDate: isoDateSchema,
  sourceName: z.string().trim().min(1),
  coverageKind: z.enum(["maritime", "fluvial", "mixed"]),
  qualityBand: z.enum(["high", "medium", "partial"]),
  coverageNote: z.string().trim().min(1).nullable().optional(),
  cells: z
    .array(
      z.object({
        cellId: z.string().trim().min(1),
        gridSystem: z.literal("h3"),
        resolution: z.number().int().min(0).max(15),
        lat: z.number().min(-90).max(90),
        lon: z.number().min(-180).max(180),
        geometryBounds: z
          .object({
            west: z.number(),
            south: z.number(),
            east: z.number(),
            north: z.number(),
          })
          .nullable()
          .optional(),
        presenceCount: z.number().int().nonnegative(),
        hoursObserved: z.number().nonnegative(),
        sourceName: z.string().trim().min(1),
        coverageKind: z.enum(["maritime", "fluvial", "mixed"]),
        qualityBand: z.enum(["high", "medium", "partial"]),
      }),
    )
    .default([]),
});

export type HeatmapDailyQuery = z.infer<typeof heatmapDailyQuerySchema>;
