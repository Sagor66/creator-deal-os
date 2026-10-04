import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createLogger } from "./logger.js";
import { requestContext } from "./request-context.js";

function captureLogger() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  const logger = createLogger({ LOG_LEVEL: "trace", LOG_FORMAT: "json", APP_VERSION: "t" }, stream);
  return {
    logger,
    lines,
    entries: () => lines.map((line) => JSON.parse(line) as Record<string, unknown>),
  };
}

describe("createLogger", () => {
  it("writes one JSON line with the standard fields", () => {
    const { logger, entries } = captureLogger();
    logger.info({ dealCount: 3 }, "hello");
    expect(entries()).toEqual([
      expect.objectContaining({
        level: "info",
        msg: "hello",
        dealCount: 3,
        service: "creator-deal-os-api",
        version: "t",
        time: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) as unknown,
      }),
    ]);
  });

  it("redacts secrets, personal data and sensitive headers at any logged depth", () => {
    const { logger, lines } = captureLogger();
    const secrets = {
      password: "pw-123",
      token: "tok-456",
      email: "creator@example.com",
      user: { email: "nested@example.com", phone: "+880123456789" },
      req: { headers: { authorization: "Bearer abc.def", cookie: "sid=xyz", accept: "json" } },
      config: { db: { DATABASE_URL: "mysql://app:pw@db/app" } },
    };
    logger.info(secrets, "sensitive payload");

    const output = lines.join("");
    for (const value of [
      "pw-123",
      "tok-456",
      "creator@example.com",
      "nested@example.com",
      "+880123456789",
      "Bearer abc.def",
      "sid=xyz",
      "mysql://app:pw@db/app",
    ]) {
      expect(output).not.toContain(value);
    }
    expect(output).toContain("[REDACTED]");
    expect(output).toContain('"accept":"json"'); // non-sensitive data survives
  });

  it("adds the request ID from the async context, without passing it", async () => {
    const { logger, entries } = captureLogger();
    await requestContext.run({ requestId: "req-12345678" }, async () => {
      await Promise.resolve();
      logger.info("inside a request");
    });
    logger.info("outside");
    const [inside, outside] = entries();
    expect(inside).toMatchObject({ requestId: "req-12345678" });
    expect(outside).not.toHaveProperty("requestId");
  });
});
