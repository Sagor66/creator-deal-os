import { describe, expect, it } from "vitest";
import { ServiceInfoSchema } from "./service-info.js";

describe("ServiceInfoSchema", () => {
  const valid = {
    service: "creator-deal-os-api",
    version: "1.2.3",
    time: "2026-10-04T12:00:00.000Z",
  };

  it("accepts a well-formed payload", () => {
    expect(ServiceInfoSchema.parse(valid)).toEqual(valid);
  });

  it("rejects a different service name", () => {
    expect(ServiceInfoSchema.safeParse({ ...valid, service: "something-else" }).success).toBe(
      false,
    );
  });

  it("rejects a time that is not an ISO-8601 datetime", () => {
    expect(ServiceInfoSchema.safeParse({ ...valid, time: "yesterday" }).success).toBe(false);
  });

  it("rejects an empty version", () => {
    expect(ServiceInfoSchema.safeParse({ ...valid, version: "" }).success).toBe(false);
  });
});
