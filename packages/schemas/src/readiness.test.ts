import { describe, expect, it } from "vitest";
import { ReadinessReportSchema } from "./readiness.js";

describe("ReadinessReportSchema", () => {
  it("accepts a ready report", () => {
    const report = { status: "ready", checks: { mysql: { status: "up", durationMs: 3 } } };
    expect(ReadinessReportSchema.parse(report)).toEqual(report);
  });

  it("accepts a not-ready report whose failing check carries an error code", () => {
    const report = {
      status: "not_ready",
      checks: { mysql: { status: "down", durationMs: 500, error: "timeout" } },
    };
    expect(ReadinessReportSchema.parse(report)).toEqual(report);
  });

  it("accepts shutting down with no checks", () => {
    expect(ReadinessReportSchema.safeParse({ status: "shutting_down", checks: {} }).success).toBe(
      true,
    );
  });

  it("rejects a down check without an error code", () => {
    const report = { status: "not_ready", checks: { mysql: { status: "down", durationMs: 1 } } };
    expect(ReadinessReportSchema.safeParse(report).success).toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(ReadinessReportSchema.safeParse({ status: "ok", checks: {} }).success).toBe(false);
  });
});
