import { hostname } from "node:os";
import {
  destination as fileDestination,
  pino,
  type DestinationStream,
  type Logger,
  type LoggerOptions,
} from "pino";
import type { Env } from "../config/env.js";
import { requestContext } from "./request-context.js";

export type AppLogger = Logger;

/** DI token for the process-wide pino logger. */
export const LOGGER = Symbol("LOGGER");

const SENSITIVE_KEYS = [
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "apiKey",
  "DATABASE_URL",
  "email",
  "phone",
];
const SENSITIVE_HEADERS = ["authorization", "cookie", "set-cookie", "x-api-key"];

/**
 * Safety net, not the plan: log IDs, never personal data or bodies. pino
 * wildcards match one level each, hence the explicit depths.
 */
export const REDACT_PATHS = [
  ...SENSITIVE_KEYS.flatMap((key) => [key, `*.${key}`, `*.*.${key}`]),
  ...SENSITIVE_HEADERS.flatMap((header) => [
    `headers["${header}"]`,
    `*.headers["${header}"]`,
    `*.*.headers["${header}"]`,
  ]),
];

export function createLogger(
  env: Pick<Env, "LOG_LEVEL" | "LOG_FORMAT" | "APP_VERSION">,
  destination?: DestinationStream,
): AppLogger {
  const options: LoggerOptions = {
    level: env.LOG_LEVEL,
    base: {
      service: "creator-deal-os-api",
      version: env.APP_VERSION,
      pid: process.pid,
      hostname: hostname(),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: { paths: REDACT_PATHS, censor: "[REDACTED]" },
    // Adds requestId (and later workspaceId/userId) to every line logged inside a request.
    mixin: () => ({ ...requestContext.current() }),
  };

  if (env.LOG_FORMAT === "pretty" && !destination) {
    return pino({
      ...options,
      transport: {
        target: "pino-pretty",
        options: { translateTime: "SYS:HH:MM:ss.l", ignore: "pid,hostname,service,version" },
      },
    });
  }

  // JSON: level as a label, written synchronously so nothing is lost on exit.
  return pino(
    { ...options, formatters: { level: (label) => ({ level: label }) } },
    destination ?? fileDestination({ dest: 1, sync: true }),
  );
}
