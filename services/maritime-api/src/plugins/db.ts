import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import type { MaritimeApiEnv } from "../config/env.js";
import * as schema from "../db/schema/index.js";

export type MaritimeDatabase = PostgresJsDatabase<typeof schema>;
export type MaritimeDbLike = Pick<
  MaritimeDatabase,
  "select" | "insert" | "update" | "delete" | "execute" | "transaction"
>;

export interface MaritimeDatabaseClient {
  db: MaritimeDatabase;
  close: () => Promise<void>;
}

export function createDatabase(databaseUrl: string): MaritimeDatabaseClient {
  const client = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    prepare: false,
  });

  return {
    db: drizzle(client, { schema }),
    close: async () => {
      await client.end({ timeout: 5 });
    },
  };
}

export type DatabaseConnection = MaritimeDatabaseClient;

export function createDatabaseConnection(env: MaritimeApiEnv): DatabaseConnection {
  return createDatabase(env.databaseUrl);
}
