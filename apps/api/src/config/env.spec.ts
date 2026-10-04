import { describe, expect, it } from "vitest";
import { EnvValidationError, loadEnv } from "./env.js";

const valid = { DATABASE_URL: "mysql://app:s3cret-pw@127.0.0.1:3306/creator_deal_os" };

function problemsOf(source: Record<string, string | undefined>): readonly string[] {
  try {
    loadEnv(source);
  } catch (error) {
    if (error instanceof EnvValidationError) return error.problems;
    throw error;
  }
  throw new Error("expected loadEnv to fail");
}

describe("loadEnv", () => {
  it("parses a valid env and applies defaults", () => {
    expect(loadEnv(valid)).toEqual({
      NODE_ENV: "development",
      PORT: 3001,
      APP_VERSION: "dev",
      DATABASE_URL: valid.DATABASE_URL,
      LOG_LEVEL: "debug",
      LOG_FORMAT: "pretty",
      TRUST_PROXY: false,
      SHUTDOWN_TIMEOUT_MS: 10_000,
    });
  });

  it("picks log level and format per environment", () => {
    expect(loadEnv({ ...valid, NODE_ENV: "production" })).toMatchObject({
      LOG_LEVEL: "info",
      LOG_FORMAT: "json",
    });
    expect(loadEnv({ ...valid, NODE_ENV: "test" })).toMatchObject({ LOG_LEVEL: "silent" });
    expect(loadEnv({ ...valid, NODE_ENV: "production", LOG_LEVEL: "debug" }).LOG_LEVEL).toBe(
      "debug",
    );
  });

  it("reports a missing required variable as required", () => {
    expect(problemsOf({})).toEqual(["DATABASE_URL: required"]);
  });

  it("treats an empty value as unset", () => {
    expect(problemsOf({ DATABASE_URL: "" })).toEqual(["DATABASE_URL: required"]);
    expect(loadEnv({ ...valid, PORT: "" }).PORT).toBe(3001);
  });

  it("rejects a wrong type", () => {
    expect(problemsOf({ ...valid, PORT: "abc" })).toEqual([
      expect.stringMatching(/^PORT: /) as unknown,
    ]);
  });

  it("rejects a database URL that is not mysql://", () => {
    expect(problemsOf({ DATABASE_URL: "postgres://app:pw@db:5432/app" })).toEqual([
      "DATABASE_URL: must look like mysql://user:password@host:3306/database",
    ]);
  });

  it("parses booleans strictly: 'false' is false", () => {
    expect(loadEnv({ ...valid, TRUST_PROXY: "false" }).TRUST_PROXY).toBe(false);
    expect(loadEnv({ ...valid, TRUST_PROXY: "true" }).TRUST_PROXY).toBe(true);
    expect(problemsOf({ ...valid, TRUST_PROXY: "maybe" })).toHaveLength(1);
  });

  it("lists every problem at once", () => {
    const problems = problemsOf({ PORT: "99999", NODE_ENV: "staging", LOG_FORMAT: "xml" });
    expect(problems.map((problem) => problem.split(":")[0])).toEqual(
      expect.arrayContaining(["NODE_ENV", "PORT", "DATABASE_URL", "LOG_FORMAT"]),
    );
    expect(problems).toHaveLength(4);
  });

  it("never echoes the values back, since they may be secrets", () => {
    const secret = "hunter2-not-a-url";
    const error = (() => {
      try {
        loadEnv({ DATABASE_URL: secret, SHUTDOWN_TIMEOUT_MS: "12345678" });
      } catch (caught) {
        return caught;
      }
      return undefined;
    })();
    expect(error).toBeInstanceOf(EnvValidationError);
    const message = (error as EnvValidationError).message;
    expect(message).not.toContain(secret);
    expect(message).not.toContain("12345678");
  });
});
