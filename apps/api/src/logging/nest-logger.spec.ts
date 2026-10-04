import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createLogger } from "./logger.js";
import { PinoNestLogger } from "./nest-logger.js";

function setup() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  const logger = createLogger({ LOG_LEVEL: "trace", LOG_FORMAT: "json", APP_VERSION: "t" }, stream);
  return {
    nest: new PinoNestLogger(logger),
    entries: () => lines.map((line) => JSON.parse(line) as Record<string, unknown>),
  };
}

const STACK = "Error: connect ETIMEDOUT\n    at Pool.end (pool.js:1:1)";

describe("PinoNestLogger", () => {
  it("maps (message, context)", () => {
    const { nest, entries } = setup();
    nest.log("Mapped {/health, GET} route", "RouterExplorer");
    expect(entries()[0]).toMatchObject({
      level: "info",
      msg: "Mapped {/health, GET} route",
      context: "RouterExplorer",
    });
  });

  it("maps (message, stack) without mistaking the stack for a context", () => {
    const { nest, entries } = setup();
    nest.error("connect ETIMEDOUT", STACK);
    const [entry] = entries();
    expect(entry).toMatchObject({
      level: "error",
      msg: "connect ETIMEDOUT",
      err: { stack: STACK },
    });
    expect(entry).not.toHaveProperty("context", STACK);
  });

  it("maps (message, stack, context)", () => {
    const { nest, entries } = setup();
    nest.error("boom", STACK, "ExceptionsHandler");
    expect(entries()[0]).toMatchObject({
      msg: "boom",
      context: "ExceptionsHandler",
      err: { stack: STACK },
    });
  });

  it("maps an Error object", () => {
    const { nest, entries } = setup();
    nest.error(new Error("kaboom"), "ExceptionsHandler");
    expect(entries()[0]).toMatchObject({
      msg: "kaboom",
      context: "ExceptionsHandler",
      err: { message: "kaboom" },
    });
  });
});
