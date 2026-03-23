CREATE TABLE "maritime_alerts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maritime_alerts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"shipment_id" integer NOT NULL,
	"vessel_id" integer,
	"alert_type" text NOT NULL,
	"severity" text NOT NULL,
	"state" text DEFAULT 'open' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"detected_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maritime_ports" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maritime_ports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"unlocode" text,
	"port_name" text NOT NULL,
	"country_code" text,
	"port_kind" text,
	"lat" double precision,
	"lon" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maritime_refresh_requests" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maritime_refresh_requests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"shipment_id" integer NOT NULL,
	"request_source" text DEFAULT 'manual' NOT NULL,
	"requested_by" text,
	"note" text,
	"state" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "maritime_shipment_vessel_assignments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maritime_shipment_vessel_assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"shipment_id" integer NOT NULL,
	"vessel_id" integer NOT NULL,
	"source" text NOT NULL,
	"confidence" double precision,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maritime_shipments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maritime_shipments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"shipment_ref" text NOT NULL,
	"direction" text,
	"origin_name" text,
	"destination_name" text,
	"carrier_name" text,
	"shipment_state" text DEFAULT 'planned' NOT NULL,
	"operational_window_start" timestamp with time zone,
	"operational_window_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maritime_status_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maritime_status_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"shipment_id" integer NOT NULL,
	"vessel_id" integer,
	"event_type" text NOT NULL,
	"event_summary" text NOT NULL,
	"event_at" timestamp with time zone NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maritime_sync_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maritime_sync_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"provider_source" text NOT NULL,
	"state" text NOT NULL,
	"shipment_count" integer DEFAULT 0 NOT NULL,
	"snapshot_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "maritime_tracking_current" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maritime_tracking_current_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"shipment_id" integer NOT NULL,
	"vessel_id" integer,
	"latest_snapshot_id" integer,
	"tracking_status" text DEFAULT 'empty' NOT NULL,
	"signal_freshness" text DEFAULT 'lost' NOT NULL,
	"last_observed_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lat" double precision,
	"lon" double precision,
	"sog" double precision,
	"cog" double precision,
	"nav_status" text,
	"eta" timestamp with time zone,
	"destination_text" text,
	"destination_port_id" integer,
	"status_summary" text DEFAULT 'Sin tracking disponible' NOT NULL,
	"provider_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maritime_tracking_snapshots" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maritime_tracking_snapshots_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"shipment_id" integer NOT NULL,
	"vessel_id" integer,
	"observed_at" timestamp with time zone NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"sog" double precision,
	"cog" double precision,
	"nav_status" text,
	"eta" timestamp with time zone,
	"destination_text" text,
	"destination_port_id" integer,
	"signal_freshness" text DEFAULT 'fresh' NOT NULL,
	"status_summary" text NOT NULL,
	"provider_source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maritime_vessels" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maritime_vessels_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"imo" text,
	"mmsi" text,
	"vessel_name" text NOT NULL,
	"flag_country" text,
	"vessel_type" text,
	"length_meters" double precision,
	"beam_meters" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "maritime_alerts" ADD CONSTRAINT "maritime_alerts_shipment_id_maritime_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."maritime_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_alerts" ADD CONSTRAINT "maritime_alerts_vessel_id_maritime_vessels_id_fk" FOREIGN KEY ("vessel_id") REFERENCES "public"."maritime_vessels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_refresh_requests" ADD CONSTRAINT "maritime_refresh_requests_shipment_id_maritime_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."maritime_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_shipment_vessel_assignments" ADD CONSTRAINT "maritime_shipment_vessel_assignments_shipment_id_maritime_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."maritime_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_shipment_vessel_assignments" ADD CONSTRAINT "maritime_shipment_vessel_assignments_vessel_id_maritime_vessels_id_fk" FOREIGN KEY ("vessel_id") REFERENCES "public"."maritime_vessels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_status_events" ADD CONSTRAINT "maritime_status_events_shipment_id_maritime_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."maritime_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_status_events" ADD CONSTRAINT "maritime_status_events_vessel_id_maritime_vessels_id_fk" FOREIGN KEY ("vessel_id") REFERENCES "public"."maritime_vessels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_tracking_current" ADD CONSTRAINT "maritime_tracking_current_shipment_id_maritime_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."maritime_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_tracking_current" ADD CONSTRAINT "maritime_tracking_current_vessel_id_maritime_vessels_id_fk" FOREIGN KEY ("vessel_id") REFERENCES "public"."maritime_vessels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_tracking_current" ADD CONSTRAINT "maritime_tracking_current_latest_snapshot_id_maritime_tracking_snapshots_id_fk" FOREIGN KEY ("latest_snapshot_id") REFERENCES "public"."maritime_tracking_snapshots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_tracking_current" ADD CONSTRAINT "maritime_tracking_current_destination_port_id_maritime_ports_id_fk" FOREIGN KEY ("destination_port_id") REFERENCES "public"."maritime_ports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_tracking_snapshots" ADD CONSTRAINT "maritime_tracking_snapshots_shipment_id_maritime_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."maritime_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_tracking_snapshots" ADD CONSTRAINT "maritime_tracking_snapshots_vessel_id_maritime_vessels_id_fk" FOREIGN KEY ("vessel_id") REFERENCES "public"."maritime_vessels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_tracking_snapshots" ADD CONSTRAINT "maritime_tracking_snapshots_destination_port_id_maritime_ports_id_fk" FOREIGN KEY ("destination_port_id") REFERENCES "public"."maritime_ports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "maritime_alerts_shipment_state_detected_idx" ON "maritime_alerts" USING btree ("shipment_id","state","detected_at");--> statement-breakpoint
CREATE UNIQUE INDEX "maritime_ports_unlocode_key" ON "maritime_ports" USING btree ("unlocode");--> statement-breakpoint
CREATE INDEX "maritime_refresh_requests_state_requested_idx" ON "maritime_refresh_requests" USING btree ("state","requested_at");--> statement-breakpoint
CREATE UNIQUE INDEX "maritime_shipments_shipment_ref_key" ON "maritime_shipments" USING btree ("shipment_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "maritime_tracking_current_shipment_key" ON "maritime_tracking_current" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "maritime_tracking_snapshots_shipment_observed_idx" ON "maritime_tracking_snapshots" USING btree ("shipment_id","observed_at");--> statement-breakpoint
CREATE INDEX "maritime_tracking_snapshots_vessel_observed_idx" ON "maritime_tracking_snapshots" USING btree ("vessel_id","observed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "maritime_vessels_imo_key" ON "maritime_vessels" USING btree ("imo");--> statement-breakpoint
CREATE UNIQUE INDEX "maritime_vessels_mmsi_key" ON "maritime_vessels" USING btree ("mmsi");