import { Controller, Get } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import { afterEach, describe, expect, it } from "vitest";
import { createTestApp, type TestApp } from "./support/test-app.js";

@Controller("boom")
class BoomController {
  @Get()
  explode(): never {
    throw new Error("kaboom");
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("request IDs and access logs (e2e)", () => {
  let t: TestApp | undefined;

  afterEach(async () => {
    await t?.app.close();
    t = undefined;
  });

  const accessLogs = (app: TestApp) =>
    app.logs().filter((entry) => entry.msg === "request completed");

  it("generates a request ID, returns it, and logs one access line with it", async () => {
    t = await createTestApp();
    const response = await request(t.app.getHttpServer() as App)
      .get("/meta")
      .expect(200);
    const requestId = response.headers["x-request-id"];
    expect(requestId).toMatch(UUID);
    expect(accessLogs(t)).toEqual([
      expect.objectContaining({
        level: "info",
        requestId,
        method: "GET",
        route: "/meta",
        status: 200,
        durationMs: expect.any(Number) as unknown,
      }),
    ]);
  });

  it("keeps a well-formed incoming X-Request-Id", async () => {
    t = await createTestApp();
    await request(t.app.getHttpServer() as App)
      .get("/meta")
      .set("X-Request-Id", "web-7f3a9c21")
      .expect("x-request-id", "web-7f3a9c21");
  });

  it("replaces a malformed incoming X-Request-Id", async () => {
    t = await createTestApp();
    const response = await request(t.app.getHttpServer() as App)
      .get("/meta")
      .set("X-Request-Id", "bad id!")
      .expect(200);
    expect(response.headers["x-request-id"]).toMatch(UUID);
  });

  it("logs health probes at debug, not info", async () => {
    t = await createTestApp();
    await request(t.app.getHttpServer() as App)
      .get("/health")
      .expect(200);
    expect(accessLogs(t)).toEqual([expect.objectContaining({ level: "debug", route: "/health" })]);
  });

  it("logs an unhandled error once, with its stack and the request ID", async () => {
    t = await createTestApp({ controllers: [BoomController] });
    const response = await request(t.app.getHttpServer() as App)
      .get("/boom")
      .expect(500);
    const requestId = response.headers["x-request-id"];

    const errorLogs = t.logs().filter((entry) => entry.err !== undefined);
    expect(errorLogs).toHaveLength(1);
    expect(errorLogs[0]).toMatchObject({ level: "error", requestId });
    expect(JSON.stringify(errorLogs[0]?.err)).toContain("kaboom");
    expect(JSON.stringify(errorLogs[0]?.err)).toContain("at ");
    expect(accessLogs(t)).toEqual([
      expect.objectContaining({ level: "error", status: 500, requestId }),
    ]);
  });
});
