import { readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { describe, expect, it } from "vitest";
import * as schema from "../db/schema/index.js";
import { createMaritimeHeatmapRepository } from "./maritimeHeatmapRepository.js";

async function createTestDb() {
  const client = new PGlite();
  const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");
  const migrationFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const migrationFile of migrationFiles) {
    const sqlText = readFileSync(join(migrationsDir, migrationFile), "utf8");
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

describe("createMaritimeHeatmapRepository", () => {
  it("importa un snapshot y lo expone como latest diario", async () => {
    const { client, db } = await createTestDb();
    const repository = createMaritimeHeatmapRepository({ db: db as never });

    await repository.importSnapshot({
      snapshotDate: "2026-03-22",
      sourceName: "public-ais",
      coverageKind: "mixed",
      qualityBand: "partial",
      coverageNote: "Cobertura referencial, parcial en corredores fluviales",
      cells: [
        {
          cellId: "84754a9ffffffff",
          gridSystem: "h3",
          resolution: 4,
          lat: -12.2,
          lon: -77.3,
          geometryBounds: null,
          presenceCount: 12,
          hoursObserved: 8,
          sourceName: "public-ais",
          coverageKind: "maritime",
          qualityBand: "partial",
        },
        {
          cellId: "84754e9ffffffff",
          gridSystem: "h3",
          resolution: 4,
          lat: -3.7,
          lon: -73.2,
          geometryBounds: null,
          presenceCount: 6,
          hoursObserved: 4,
          sourceName: "public-ais",
          coverageKind: "fluvial",
          qualityBand: "partial",
        },
      ],
    });

    const latest = await repository.getLatestSnapshot();
    const coverage = await repository.getCoverage();
    const cells = await repository.listCellsForDate("2026-03-22");

    expect(latest?.snapshotDate).toBe("2026-03-22");
    expect(latest?.cellCount).toBe(2);
    expect(coverage?.qualityBand).toBe("partial");
    expect(cells).toHaveLength(2);
    expect(cells[0]?.presenceCount).toBeGreaterThanOrEqual(cells[1]?.presenceCount ?? 0);

    await client.close();
  }, 15_000);
});
