import type {
  MaritimeAlertSeverity,
  MaritimeAlertState,
  MaritimeHeatmapCoverageKind,
  MaritimeHeatmapGeometryBounds,
  MaritimeHeatmapGridSystem,
  MaritimeHeatmapQualityBand,
  MaritimeShipmentDirection,
  MaritimeShipmentState,
  MaritimeSignalFreshness,
} from "../../contracts/maritime.js";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const maritimeShipments = pgTable(
  "maritime_shipments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    shipmentRef: text("shipment_ref").notNull(),
    direction: text("direction").$type<MaritimeShipmentDirection | null>(),
    originName: text("origin_name"),
    destinationName: text("destination_name"),
    carrierName: text("carrier_name"),
    shipmentState: text("shipment_state").$type<MaritimeShipmentState>().notNull().default("planned"),
    operationalWindowStart: timestamp("operational_window_start", {
      withTimezone: true,
      mode: "string",
    }),
    operationalWindowEnd: timestamp("operational_window_end", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("maritime_shipments_shipment_ref_key").on(table.shipmentRef)],
);

export const maritimeVessels = pgTable(
  "maritime_vessels",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    imo: text("imo"),
    mmsi: text("mmsi"),
    vesselName: text("vessel_name").notNull(),
    flagCountry: text("flag_country"),
    vesselType: text("vessel_type"),
    lengthMeters: doublePrecision("length_meters"),
    beamMeters: doublePrecision("beam_meters"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("maritime_vessels_imo_key").on(table.imo),
    uniqueIndex("maritime_vessels_mmsi_key").on(table.mmsi),
  ],
);

export const maritimePorts = pgTable(
  "maritime_ports",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    unlocode: text("unlocode"),
    portName: text("port_name").notNull(),
    countryCode: text("country_code"),
    portKind: text("port_kind"),
    lat: doublePrecision("lat"),
    lon: doublePrecision("lon"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("maritime_ports_unlocode_key").on(table.unlocode)],
);

export const maritimeShipmentVesselAssignments = pgTable("maritime_shipment_vessel_assignments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shipmentId: integer("shipment_id")
    .notNull()
    .references(() => maritimeShipments.id, { onDelete: "cascade" }),
  vesselId: integer("vessel_id")
    .notNull()
    .references(() => maritimeVessels.id, { onDelete: "cascade" }),
  source: text("source").notNull(),
  confidence: doublePrecision("confidence"),
  metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  isActive: boolean("is_active").notNull().default(true),
  validFrom: timestamp("valid_from", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  validTo: timestamp("valid_to", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const maritimeTrackingSnapshots = pgTable(
  "maritime_tracking_snapshots",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    shipmentId: integer("shipment_id")
      .notNull()
      .references(() => maritimeShipments.id, { onDelete: "cascade" }),
    vesselId: integer("vessel_id").references(() => maritimeVessels.id, { onDelete: "set null" }),
    observedAt: timestamp("observed_at", { withTimezone: true, mode: "string" }).notNull(),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
    sog: doublePrecision("sog"),
    cog: doublePrecision("cog"),
    navStatus: text("nav_status"),
    eta: timestamp("eta", { withTimezone: true, mode: "string" }),
    destinationText: text("destination_text"),
    destinationPortId: integer("destination_port_id").references(() => maritimePorts.id, {
      onDelete: "set null",
    }),
    signalFreshness: text("signal_freshness")
      .$type<MaritimeSignalFreshness>()
      .notNull()
      .default("fresh"),
    statusSummary: text("status_summary").notNull(),
    providerSource: text("provider_source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("maritime_tracking_snapshots_shipment_observed_idx").on(table.shipmentId, table.observedAt),
    index("maritime_tracking_snapshots_vessel_observed_idx").on(table.vesselId, table.observedAt),
  ],
);

export const maritimeTrackingCurrent = pgTable(
  "maritime_tracking_current",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    shipmentId: integer("shipment_id")
      .notNull()
      .references(() => maritimeShipments.id, { onDelete: "cascade" }),
    vesselId: integer("vessel_id").references(() => maritimeVessels.id, { onDelete: "set null" }),
    latestSnapshotId: integer("latest_snapshot_id").references(() => maritimeTrackingSnapshots.id, {
      onDelete: "set null",
    }),
    trackingStatus: text("tracking_status").notNull().default("empty"),
    signalFreshness: text("signal_freshness")
      .$type<MaritimeSignalFreshness>()
      .notNull()
      .default("lost"),
    lastObservedAt: timestamp("last_observed_at", { withTimezone: true, mode: "string" }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    lat: doublePrecision("lat"),
    lon: doublePrecision("lon"),
    sog: doublePrecision("sog"),
    cog: doublePrecision("cog"),
    navStatus: text("nav_status"),
    eta: timestamp("eta", { withTimezone: true, mode: "string" }),
    destinationText: text("destination_text"),
    destinationPortId: integer("destination_port_id").references(() => maritimePorts.id, {
      onDelete: "set null",
    }),
    statusSummary: text("status_summary").notNull().default("Sin tracking disponible"),
    providerSource: text("provider_source"),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("maritime_tracking_current_shipment_key").on(table.shipmentId)],
);

export const maritimeAlerts = pgTable(
  "maritime_alerts",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    shipmentId: integer("shipment_id")
      .notNull()
      .references(() => maritimeShipments.id, { onDelete: "cascade" }),
    vesselId: integer("vessel_id").references(() => maritimeVessels.id, { onDelete: "set null" }),
    alertType: text("alert_type").notNull(),
    severity: text("severity").$type<MaritimeAlertSeverity>().notNull(),
    state: text("state").$type<MaritimeAlertState>().notNull().default("open"),
    title: text("title").notNull(),
    message: text("message").notNull(),
    detectedAt: timestamp("detected_at", { withTimezone: true, mode: "string" }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [index("maritime_alerts_shipment_state_detected_idx").on(table.shipmentId, table.state, table.detectedAt)],
);

export const maritimeStatusEvents = pgTable("maritime_status_events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shipmentId: integer("shipment_id")
    .notNull()
    .references(() => maritimeShipments.id, { onDelete: "cascade" }),
  vesselId: integer("vessel_id").references(() => maritimeVessels.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  eventSummary: text("event_summary").notNull(),
  eventAt: timestamp("event_at", { withTimezone: true, mode: "string" }).notNull(),
  details: jsonb("details").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const maritimeRefreshRequests = pgTable(
  "maritime_refresh_requests",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    shipmentId: integer("shipment_id")
      .notNull()
      .references(() => maritimeShipments.id, { onDelete: "cascade" }),
    requestSource: text("request_source").notNull().default("manual"),
    requestedBy: text("requested_by"),
    note: text("note"),
    state: text("state").notNull().default("pending"),
    requestedAt: timestamp("requested_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [index("maritime_refresh_requests_state_requested_idx").on(table.state, table.requestedAt)],
);

export const maritimeSyncRuns = pgTable("maritime_sync_runs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  providerSource: text("provider_source").notNull(),
  state: text("state").notNull(),
  shipmentCount: integer("shipment_count").notNull().default(0),
  snapshotCount: integer("snapshot_count").notNull().default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true, mode: "string" }),
});

export const maritimeHeatmapSources = pgTable(
  "maritime_heatmap_sources",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sourceName: text("source_name").notNull(),
    displayName: text("display_name").notNull(),
    defaultCoverageKind: text("default_coverage_kind")
      .$type<MaritimeHeatmapCoverageKind>()
      .notNull()
      .default("mixed"),
    sourceUrl: text("source_url"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("maritime_heatmap_sources_source_name_key").on(table.sourceName)],
);

export const maritimeHeatmapRuns = pgTable(
  "maritime_heatmap_runs",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sourceId: integer("source_id")
      .notNull()
      .references(() => maritimeHeatmapSources.id, { onDelete: "cascade" }),
    sourceName: text("source_name").notNull(),
    snapshotDate: date("snapshot_date", { mode: "string" }).notNull(),
    state: text("state").notNull().default("succeeded"),
    gridSystem: text("grid_system").$type<MaritimeHeatmapGridSystem>().notNull().default("h3"),
    resolution: integer("resolution").notNull(),
    coverageKind: text("coverage_kind").$type<MaritimeHeatmapCoverageKind>().notNull(),
    qualityBand: text("quality_band").$type<MaritimeHeatmapQualityBand>().notNull(),
    note: text("note"),
    cellCount: integer("cell_count").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("maritime_heatmap_runs_source_snapshot_key").on(table.sourceId, table.snapshotDate),
    index("maritime_heatmap_runs_snapshot_idx").on(table.snapshotDate, table.state),
  ],
);

export const maritimeHeatmapDailyCells = pgTable(
  "maritime_heatmap_daily_cells",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    runId: integer("run_id")
      .notNull()
      .references(() => maritimeHeatmapRuns.id, { onDelete: "cascade" }),
    sourceId: integer("source_id")
      .notNull()
      .references(() => maritimeHeatmapSources.id, { onDelete: "cascade" }),
    sourceName: text("source_name").notNull(),
    snapshotDate: date("snapshot_date", { mode: "string" }).notNull(),
    cellId: text("cell_id").notNull(),
    gridSystem: text("grid_system").$type<MaritimeHeatmapGridSystem>().notNull().default("h3"),
    resolution: integer("resolution").notNull(),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
    geometryBounds: jsonb("geometry_bounds").$type<MaritimeHeatmapGeometryBounds | null>(),
    presenceCount: integer("presence_count").notNull().default(0),
    hoursObserved: doublePrecision("hours_observed").notNull().default(0),
    coverageKind: text("coverage_kind").$type<MaritimeHeatmapCoverageKind>().notNull(),
    qualityBand: text("quality_band").$type<MaritimeHeatmapQualityBand>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("maritime_heatmap_daily_cells_snapshot_cell_source_key").on(
      table.snapshotDate,
      table.cellId,
      table.sourceId,
    ),
    index("maritime_heatmap_daily_cells_snapshot_idx").on(table.snapshotDate, table.sourceId),
  ],
);


