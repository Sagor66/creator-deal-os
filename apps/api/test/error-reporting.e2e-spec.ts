import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  NotFoundException,
  type INestApplication,
} from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { captureSentry } from "./support/sentry-capture.js";
import { createTestApp } from "./support/test-app.js";

@Controller("fail")
class FailingController {
  @Get("crash")
  crash(): never {
    throw new Error("payment for jane@example.com failed");
  }

  @Get("server")
  server(): never {
    throw new HttpException("upstream broke", 502);
  }

  @Get("missing")
  missing(): never {
    throw new NotFoundException();
  }

  @Get("invalid")
  invalid(): never {
    throw new BadRequestException("fee must be positive");
  }
}

describe("error reporting (Sentry)", () => {
  // Delivery takes 100 ms: an event is in `delivered` only if the filter waited for it.
  const sentry = captureSentry({ deliveryDelayMs: 100 });
  let app: INestApplication;
  const http = () => request(app.getHttpServer() as App);

  beforeAll(async () => {
    ({ app } = await createTestApp({ controllers: [FailingController] }));
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    sentry.reset();
  });

  it("reports an unexpected error: delivered before responding, tagged and scrubbed", async () => {
    const response = await http()
      .get("/fail/crash?token=abc123")
      .set("X-Request-Id", "req-12345678");

    expect(response.status).toBe(500);
    // The response body is still Nest's default: no internals leak to the client.
    expect(response.body).toEqual({ statusCode: 500, message: "Internal server error" });

    // One event, already delivered when the response arrived (delivery takes 100 ms).
    expect(sentry.delivered).toHaveLength(1);
    const [event] = sentry.delivered;
    expect(event).toMatchObject({
      environment: "staging",
      release: "test-release",
      tags: { route: "GET /fail/crash", request_id: "req-12345678" },
      contexts: { http: { method: "GET", path: "/fail/crash" } },
    });
    expect(event?.exception?.values?.[0]?.value).toBe("payment for [email] failed");
    expect(JSON.stringify(event)).not.toContain("abc123");
  });

  it("reports a 5xx HttpException", async () => {
    await http().get("/fail/server").expect(502);
    expect(sentry.delivered).toHaveLength(1);
  });

  it.each(["/fail/missing", "/fail/invalid", "/no-such-route"])(
    "does not report the client error at %s",
    async (path) => {
      const response = await http().get(path);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      expect(sentry.delivered).toEqual([]);
    },
  );
});
