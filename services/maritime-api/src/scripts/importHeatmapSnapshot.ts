import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadEnv } from "../config/env.js";
import { heatmapSnapshotImportSchema } from "../contracts/maritimeHeatmap.js";
import { createDatabaseConnection } from "../plugins/db.js";
import { createMaritimeHeatmapRepository } from "../repositories/maritimeHeatmapRepository.js";

function getFileArgument(argv: string[]): string {
  const fileArg = argv[2];

  if (!fileArg) {
    throw new Error(
      "Uso: npm run heatmap:import -- <ruta-al-json>. El archivo debe contener un snapshot diario agregado.",
    );
  }

  return resolve(process.cwd(), fileArg);
}

async function main(): Promise<void> {
  const env = loadEnv();
  const filePath = getFileArgument(process.argv);
  const raw = await readFile(filePath, "utf8");
  const parsed = heatmapSnapshotImportSchema.parse(JSON.parse(raw));
  const normalizedInput = {
    ...parsed,
    cells: parsed.cells.map((cell) => ({
      ...cell,
      geometryBounds: cell.geometryBounds ?? null,
    })),
  };
  const connection = createDatabaseConnection(env);

  try {
    const repository = createMaritimeHeatmapRepository({ db: connection.db });
    const snapshot = await repository.importSnapshot(normalizedInput);

    console.info(
      `[maritime-api] Heatmap importado: ${snapshot.snapshotDate} / ${snapshot.sourceName} / ${snapshot.cellCount} celdas`,
    );
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error("[maritime-api] No se pudo importar el snapshot de heatmap.", error);
  process.exitCode = 1;
});
