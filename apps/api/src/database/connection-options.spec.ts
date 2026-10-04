import { describe, expect, it } from "vitest";
import { buildConnectionOptions } from "./connection-options.js";

const DATABASE_URL = "mysql://app:pw@db.example:3306/creator_deal_os";
const CA = "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----";

describe("buildConnectionOptions", () => {
  it("connects in plain text when TLS is off (local and CI only)", () => {
    const options = buildConnectionOptions({ DATABASE_URL, DATABASE_TLS: "off" });
    expect(options).toMatchObject({ uri: DATABASE_URL, timezone: "Z", connectTimeout: 2_000 });
    expect(options.ssl).toBeUndefined();
  });

  it("verifies the server against the given CA", () => {
    expect(
      buildConnectionOptions({ DATABASE_URL, DATABASE_TLS: "verify", DATABASE_CA_CERT: CA }).ssl,
    ).toEqual({ minVersion: "TLSv1.2", rejectUnauthorized: true, ca: CA });
  });

  it("verifies against Node's trust store when no CA is given", () => {
    expect(buildConnectionOptions({ DATABASE_URL, DATABASE_TLS: "verify" }).ssl).toEqual({
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
    });
  });

  it("lets the migration job wait longer for a cold database", () => {
    expect(
      buildConnectionOptions({ DATABASE_URL, DATABASE_TLS: "off" }, { connectTimeoutMs: 20_000 })
        .connectTimeout,
    ).toBe(20_000);
  });
});
