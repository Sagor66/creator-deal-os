import { Writable } from "node:stream";
import type { INestApplication, Type } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { vi } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { loadEnv } from "../../src/config/env.js";
import { MYSQL_POOL } from "../../src/database/database.module.js";
import { createLogger } from "../../src/logging/logger.js";
import { PinoNestLogger } from "../../src/logging/nest-logger.js";
import { EXIT } from "../../src/shutdown/shutdown.service.js";

export type PoolBehaviour = "up" | "down" | "hang";

/** Stands in for the mysql2 pool: the HTTP contract is tested here, real MySQL in the DB issue. */
export function fakePool(behaviour: PoolBehaviour = "up") {
  return {
    query: vi.fn(() => {
      if (behaviour === "up") return Promise.resolve([[{ 1: 1 }], []]);
      if (behaviour === "down") {
        return Promise.reject(
          Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:3306"), { code: "ECONNREFUSED" }),
        );
      }
      return new Promise(() => undefined); // never settles
    }),
    end: vi.fn(() => Promise.resolve()),
  };
}

export type LogEntry = Record<string, unknown> & { level: string; msg?: string; err?: unknown };

export interface TestApp {
  app: INestApplication;
  pool: ReturnType<typeof fakePool>;
  exit: ReturnType<typeof vi.fn<(code: number) => void>>;
  logs: () => LogEntry[];
}

export async function createTestApp(
  options: {
    pool?: ReturnType<typeof fakePool>;
    controllers?: Type[];
    env?: Record<string, string>;
  } = {},
): Promise<TestApp> {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  const env = loadEnv({
    NODE_ENV: "test",
    APP_VERSION: "test",
    DATABASE_URL: "mysql://test:test@127.0.0.1:3306/test",
    ...options.env,
  });
  const logger = createLogger({ ...env, LOG_LEVEL: "trace", LOG_FORMAT: "json" }, stream);
  const exit = vi.fn<(code: number) => void>();
  const pool = options.pool ?? fakePool();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forRoot({ env, logger })],
    controllers: options.controllers ?? [],
  })
    .overrideProvider(MYSQL_POOL)
    .useValue(pool)
    .overrideProvider(EXIT)
    .useValue(exit)
    .compile();

  const app = moduleRef.createNestApplication({ bufferLogs: true });
  app.useLogger(new PinoNestLogger(logger));
  await app.init();

  return { app, pool, exit, logs: () => lines.map((line) => JSON.parse(line) as LogEntry) };
}
