/**
 * Migration job entrypoint: `node dist/database/migrate.js`.
 *
 * Runs as the Cloud Run job `migrate` before each deploy (docs/design/deployment.md §3),
 * with the DDL user's DATABASE_URL. Locally: `pnpm --filter @cdo/api db:migrate`.
 */
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { createConnection } from "mysql2/promise";
import { loadEnvOrExit } from "../config/env.js";
import { createLogger } from "../logging/logger.js";
import { buildConnectionOptions } from "./connection-options.js";
import { runMigrations } from "./migration-runner.js";
import { checkMigrationsFolder } from "./migration-safety.js";

// src/database → ../../drizzle and dist/database → ../../drizzle both land on apps/api/drizzle.
const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

const env = loadEnvOrExit();
const logger = createLogger(env).child({ job: "migrate" });

// One connection, so the advisory lock and the migrations share a session.
// A cold free-tier database can take a while to answer the first time.
const connection = await createConnection(
  buildConnectionOptions(env, { connectTimeoutMs: 20_000 }),
);

try {
  await runMigrations({
    connection,
    applyMigrations: () => migrate(drizzle({ client: connection }), { migrationsFolder }),
    checkSafety: () => checkMigrationsFolder(migrationsFolder),
    logger,
  });
} catch (error) {
  logger.fatal({ err: error }, "migration failed; nothing new will be deployed");
  process.exitCode = 1;
} finally {
  await connection.end().catch((error: unknown) => {
    logger.warn({ err: error }, "migration connection did not close cleanly");
  });
}
