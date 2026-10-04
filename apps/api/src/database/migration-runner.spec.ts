import { pino } from "pino";
import { describe, expect, it, vi } from "vitest";
import {
  MIGRATION_LOCK,
  MigrationRefusedError,
  runMigrations,
  type MigrationConnection,
} from "./migration-runner.js";
import type { DestructiveFinding } from "./migration-safety.js";

const logger = pino({ level: "silent" });

/** mysql2 resolves `[rows, fields]`. */
const result = (rows: unknown): Promise<[unknown, unknown]> => Promise.resolve([rows, []]);

/** A fake connection: the lock answers `lockResult`, the table starts with `applied` rows. */
function fakeConnection({
  lockResult = 1,
  applied = 0,
}: { lockResult?: number; applied?: number | "missing" } = {}) {
  let rows = applied;
  const calls: string[] = [];
  const query = vi.fn<MigrationConnection["query"]>((sql) => {
    calls.push(sql);
    if (sql.startsWith("SELECT GET_LOCK")) return result([{ acquired: lockResult }]);
    if (sql.startsWith("SELECT RELEASE_LOCK")) return result([{ released: 1 }]);
    if (sql.startsWith("SELECT COUNT(*)")) {
      if (rows === "missing") {
        return Promise.reject(Object.assign(new Error("no such table"), { errno: 1146 }));
      }
      return result([{ n: rows }]);
    }
    return Promise.reject(new Error(`unexpected query: ${sql}`));
  });
  const connection: MigrationConnection = { query };
  const applyMigrations = vi.fn(() => {
    rows = (rows === "missing" ? 0 : rows) + 2;
    return Promise.resolve();
  });
  return { connection, query, applyMigrations, calls };
}

const safe = () => Promise.resolve<DestructiveFinding[]>([]);

describe("runMigrations", () => {
  it("takes the lock, applies, reports the count and releases the lock", async () => {
    const { connection, query, applyMigrations, calls } = fakeConnection({ applied: 3 });
    await expect(
      runMigrations({ connection, applyMigrations, checkSafety: safe, logger }),
    ).resolves.toEqual({ applied: 2 });
    expect(applyMigrations).toHaveBeenCalledOnce();
    expect(calls[0]).toMatch(/^SELECT GET_LOCK/);
    expect(calls.at(-1)).toMatch(/^SELECT RELEASE_LOCK/);
    expect(query).toHaveBeenCalledWith("SELECT GET_LOCK(?, ?) AS acquired", [MIGRATION_LOCK, 120]);
  });

  it("treats a missing migrations table as a first run", async () => {
    const { connection, applyMigrations } = fakeConnection({ applied: "missing" });
    await expect(
      runMigrations({ connection, applyMigrations, checkSafety: safe, logger }),
    ).resolves.toEqual({ applied: 2 });
  });

  it("refuses before any query when a destructive statement is unacknowledged", async () => {
    const { connection, query, applyMigrations } = fakeConnection();
    const finding = { file: "0003_x.sql", statement: 1, rule: "drops a column", excerpt: "…" };
    await expect(
      runMigrations({
        connection,
        applyMigrations,
        checkSafety: () => Promise.resolve([finding]),
        logger,
      }),
    ).rejects.toBeInstanceOf(MigrationRefusedError);
    expect(query).not.toHaveBeenCalled();
    expect(applyMigrations).not.toHaveBeenCalled();
  });

  it("refuses when another run holds the lock", async () => {
    const { connection, applyMigrations } = fakeConnection({ lockResult: 0 });
    await expect(
      runMigrations({
        connection,
        applyMigrations,
        checkSafety: safe,
        logger,
        lockTimeoutSeconds: 1,
      }),
    ).rejects.toThrow(/holds the lock/);
    expect(applyMigrations).not.toHaveBeenCalled();
  });

  it("releases the lock even when a migration fails", async () => {
    const { connection, calls } = fakeConnection();
    const failing = vi.fn(() => Promise.reject(new Error("syntax error")));
    await expect(
      runMigrations({ connection, applyMigrations: failing, checkSafety: safe, logger }),
    ).rejects.toThrow("syntax error");
    expect(calls.at(-1)).toMatch(/^SELECT RELEASE_LOCK/);
  });
});
