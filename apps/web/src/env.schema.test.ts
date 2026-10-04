import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./env.schema";

const defaults = {
  API_URL: "http://localhost:3001",
  APP_VERSION: "dev",
  DEBUG_PAGES_ENABLED: false,
};

describe("parseServerEnv", () => {
  it("defaults everything for local development", () => {
    expect(parseServerEnv({})).toEqual(defaults);
    expect(parseServerEnv({ API_URL: "", APP_VERSION: "" })).toEqual(defaults);
  });

  it("accepts a valid URL", () => {
    expect(parseServerEnv({ API_URL: "https://api.example.com" }).API_URL).toBe(
      "https://api.example.com",
    );
  });

  it("rejects something that is not a URL", () => {
    expect(() => parseServerEnv({ API_URL: "not a url" })).toThrow();
  });

  it("ignores unrelated variables", () => {
    expect(parseServerEnv({ PATH: "/usr/bin", SECRET_THING: "x" })).toEqual(defaults);
  });

  describe("error tracking", () => {
    const dsn = "https://publickey@o1.ingest.de.sentry.io/2";

    it("accepts a DSN with an explicit environment", () => {
      expect(parseServerEnv({ SENTRY_DSN: dsn, SENTRY_ENVIRONMENT: "production" })).toMatchObject({
        SENTRY_DSN: dsn,
        SENTRY_ENVIRONMENT: "production",
      });
    });

    it("requires the environment whenever a DSN is set", () => {
      expect(() => parseServerEnv({ SENTRY_DSN: dsn })).toThrow(/SENTRY_ENVIRONMENT/);
    });
  });

  it("parses the debug-pages flag strictly ('false' is false)", () => {
    expect(parseServerEnv({ DEBUG_PAGES_ENABLED: "true" }).DEBUG_PAGES_ENABLED).toBe(true);
    expect(parseServerEnv({ DEBUG_PAGES_ENABLED: "false" }).DEBUG_PAGES_ENABLED).toBe(false);
    expect(() => parseServerEnv({ DEBUG_PAGES_ENABLED: "maybe" })).toThrow();
  });
});
