CREATE TABLE "maritime_heatmap_daily_cells" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maritime_heatmap_daily_cells_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"run_id" integer NOT NULL,
	"source_id" integer NOT NULL,
	"source_name" text NOT NULL,
	"snapshot_date" date NOT NULL,
	"cell_id" text NOT NULL,
	"grid_system" text DEFAULT 'h3' NOT NULL,
	"resolution" integer NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"geometry_bounds" jsonb,
	"presence_count" integer DEFAULT 0 NOT NULL,
	"hours_observed" double precision DEFAULT 0 NOT NULL,
	"coverage_kind" text NOT NULL,
	"quality_band" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maritime_heatmap_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maritime_heatmap_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"source_id" integer NOT NULL,
	"source_name" text NOT NULL,
	"snapshot_date" date NOT NULL,
	"state" text DEFAULT 'succeeded' NOT NULL,
	"grid_system" text DEFAULT 'h3' NOT NULL,
	"resolution" integer NOT NULL,
	"coverage_kind" text NOT NULL,
	"quality_band" text NOT NULL,
	"note" text,
	"cell_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maritime_heatmap_sources" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maritime_heatmap_sources_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"source_name" text NOT NULL,
	"display_name" text NOT NULL,
	"default_coverage_kind" text DEFAULT 'mixed' NOT NULL,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "maritime_heatmap_daily_cells" ADD CONSTRAINT "maritime_heatmap_daily_cells_run_id_maritime_heatmap_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."maritime_heatmap_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_heatmap_daily_cells" ADD CONSTRAINT "maritime_heatmap_daily_cells_source_id_maritime_heatmap_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."maritime_heatmap_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_heatmap_runs" ADD CONSTRAINT "maritime_heatmap_runs_source_id_maritime_heatmap_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."maritime_heatmap_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "maritime_heatmap_daily_cells_snapshot_cell_source_key" ON "maritime_heatmap_daily_cells" USING btree ("snapshot_date","cell_id","source_id");--> statement-breakpoint
CREATE INDEX "maritime_heatmap_daily_cells_snapshot_idx" ON "maritime_heatmap_daily_cells" USING btree ("snapshot_date","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "maritime_heatmap_runs_source_snapshot_key" ON "maritime_heatmap_runs" USING btree ("source_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "maritime_heatmap_runs_snapshot_idx" ON "maritime_heatmap_runs" USING btree ("snapshot_date","state");--> statement-breakpoint
CREATE UNIQUE INDEX "maritime_heatmap_sources_source_name_key" ON "maritime_heatmap_sources" USING btree ("source_name");