import type { ConnectionOptions } from "mysql2";
import type { Env } from "../config/env.js";

type DatabaseEnv = Pick<Env, "DATABASE_URL" | "DATABASE_TLS" | "DATABASE_CA_CERT">;

/**
 * The one place connection settings are decided, shared by the API's pool and the
 * migration job so the two can't drift (docs/design/deployment.md §2).
 */
export function buildConnectionOptions(
  env: DatabaseEnv,
  { connectTimeoutMs = 2_000 }: { connectTimeoutMs?: number } = {},
): ConnectionOptions {
  return {
    uri: env.DATABASE_URL,
    connectTimeout: connectTimeoutMs,
    enableKeepAlive: true,
    timezone: "Z",
    ...(env.DATABASE_TLS === "verify" && {
      ssl: {
        minVersion: "TLSv1.2",
        rejectUnauthorized: true,
        // Without an explicit CA, Node's built-in trust store is used.
        ...(env.DATABASE_CA_CERT !== undefined && { ca: env.DATABASE_CA_CERT }),
      },
    }),
  };
}
