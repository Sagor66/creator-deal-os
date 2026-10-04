import type { AppLogger } from "../logging/logger.js";
import type { DestructiveFinding } from "./migration-safety.js";

/** Advisory lock name: two runs (pipeline + manual) can never migrate at once. */
export const MIGRATION_LOCK = "cdo:migrate";
const MIGRATIONS_TABLE = "__drizzle_migrations";
const ER_NO_SUCH_TABLE = 1146;

/** The slice of a mysql2/promise connection the runner uses, so tests can fake it. */
export interface MigrationConnection {
  query(sql: string, values?: unknown[]): Promise<[unknown, unknown]>;
}

export interface MigrationRunnerDeps {
  connection: MigrationConnection;
  /** Drizzle's migrate(), bound to the same connection. */
  applyMigrations: () => Promise<void>;
  checkSafety: () => Promise<DestructiveFinding[]>;
  logger: AppLogger;
  lockTimeoutSeconds?: number;
}

export class MigrationRefusedError extends Error {
  override readonly name = "MigrationRefusedError";
}

function firstRow(rows: unknown): Record<string, unknown> | undefined {
  return Array.isArray(rows) ? (rows[0] as Record<string, unknown> | undefined) : undefined;
}

async function countApplied(connection: MigrationConnection): Promise<number> {
  try {
    const [rows] = await connection.query(`SELECT COUNT(*) AS n FROM \`${MIGRATIONS_TABLE}\``);
    return Number(firstRow(rows)?.["n"] ?? 0);
  } catch (error) {
    // First run ever: drizzle creates the table during migrate().
    if ((error as { errno?: number }).errno === ER_NO_SUCH_TABLE) return 0;
    throw error;
  }
}

/**
 * Check → lock → apply → report. Throws on any refusal or failure, so the
 * entrypoint exits non-zero and the deploy stops before new code takes traffic.
 */
export async function runMigrations(deps: MigrationRunnerDeps): Promise<{ applied: number }> {
  const { connection, applyMigrations, checkSafety, logger, lockTimeoutSeconds = 120 } = deps;

  // Before touching the database at all.
  const findings = await checkSafety();
  if (findings.length > 0) {
    logger.error({ findings }, "unacknowledged destructive migration statements");
    throw new MigrationRefusedError(
      `${String(findings.length)} destructive statement(s) lack "-- allow-destructive: <reason>"`,
    );
  }

  const [lockRows] = await connection.query("SELECT GET_LOCK(?, ?) AS acquired", [
    MIGRATION_LOCK,
    lockTimeoutSeconds,
  ]);
  if (Number(firstRow(lockRows)?.["acquired"]) !== 1) {
    throw new MigrationRefusedError(
      `another migration holds the lock "${MIGRATION_LOCK}" (waited ${String(lockTimeoutSeconds)}s)`,
    );
  }

  try {
    const before = await countApplied(connection);
    logger.info({ alreadyApplied: before }, "applying pending migrations");
    await applyMigrations();
    const after = await countApplied(connection);
    const applied = after - before;
    logger.info({ applied, total: after }, "migrations up to date");
    return { applied };
  } finally {
    await connection.query("SELECT RELEASE_LOCK(?)", [MIGRATION_LOCK]);
  }
}
