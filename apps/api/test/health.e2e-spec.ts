import request from "supertest";
import type { App } from "supertest/types.js";
import { afterEach, describe, expect, it } from "vitest";
import { ShutdownService } from "../src/shutdown/shutdown.service.js";
import { createTestApp, fakePool, type TestApp } from "./support/test-app.js";

describe("health endpoints (e2e)", () => {
  let t: TestApp | undefined;

  afterEach(async () => {
    await t?.app.close();
    t = undefined;
  });

  const http = (app: TestApp) => request(app.app.getHttpServer() as App);

  it("GET /health is 200 and never touches the database", async () => {
    t = await createTestApp({ pool: fakePool("down") });
    const response = await http(t).get("/health").expect(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(t.pool.query).not.toHaveBeenCalled();
  });

  it("GET /health/ready is 200 when MySQL answers", async () => {
    t = await createTestApp({ pool: fakePool("up") });
    const response = await http(t).get("/health/ready").expect(200);
    expect(response.body).toEqual({
      status: "ready",
      checks: { mysql: { status: "up", durationMs: expect.any(Number) as unknown } },
    });
    expect(t.pool.query).toHaveBeenCalledWith({ sql: "SELECT 1", timeout: 500 });
  });

  it("GET /health/ready is 503 with a safe error code when MySQL refuses", async () => {
    t = await createTestApp({ pool: fakePool("down") });
    const response = await http(t).get("/health/ready").expect(503);
    expect(response.body).toEqual({
      status: "not_ready",
      checks: {
        mysql: { status: "down", durationMs: expect.any(Number) as unknown, error: "ECONNREFUSED" },
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("127.0.0.1"); // the message stays in the logs
    expect(t.logs()).toContainEqual(
      expect.objectContaining({ level: "warn", msg: "readiness check failed", check: "mysql" }),
    );
  });

  it("GET /health/ready times out a hanging check and still answers within a second", async () => {
    t = await createTestApp({ pool: fakePool("hang") });
    const startedAt = performance.now();
    const response = await http(t).get("/health/ready").expect(503);
    expect(performance.now() - startedAt).toBeLessThan(1_000);
    expect(response.body).toMatchObject({
      status: "not_ready",
      checks: { mysql: { error: "timeout" } },
    });
  });

  it("GET /health/ready is 503 once shutdown has started, while liveness stays 200", async () => {
    t = await createTestApp({ pool: fakePool("up") });
    t.app.get(ShutdownService).beforeApplicationShutdown("SIGTERM");
    await http(t).get("/health/ready").expect(503, { status: "shutting_down", checks: {} });
    await http(t).get("/health").expect(200);
  });
});
