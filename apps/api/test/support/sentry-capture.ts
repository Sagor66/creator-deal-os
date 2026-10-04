import { setTimeout as sleep } from "node:timers/promises";
import * as Sentry from "@sentry/node";
import { loadEnv } from "../../src/config/env.js";
import { initSentry } from "../../src/observability/sentry.js";

export type CapturedEvent = Record<string, unknown> & {
  environment?: string;
  release?: string;
  tags?: Record<string, string>;
  contexts?: Record<string, Record<string, unknown>>;
  exception?: { values?: { type?: string; value?: string }[] };
  request?: Record<string, unknown>;
};

/** Pulls the error events out of a Sentry envelope (newline-delimited JSON). */
function eventsIn(body: string | Uint8Array): CapturedEvent[] {
  const lines = (typeof body === "string" ? body : new TextDecoder().decode(body)).split("\n");
  const events: CapturedEvent[] = [];
  for (let i = 1; i < lines.length - 1; i += 2) {
    const header = JSON.parse(lines[i] ?? "{}") as { type?: string };
    if (header.type === "event") events.push(JSON.parse(lines[i + 1] ?? "{}") as CapturedEvent);
  }
  return events;
}

/**
 * Initialises Sentry exactly as production does (same options, same scrubbing),
 * with an in-memory transport that "delivers" after `deliveryDelayMs`. An event
 * appears in `delivered` only once that delivery has finished.
 */
export function captureSentry({ deliveryDelayMs = 0 } = {}) {
  const delivered: CapturedEvent[] = [];
  const env = loadEnv({
    NODE_ENV: "test",
    APP_VERSION: "test-release",
    DATABASE_URL: "mysql://test:test@127.0.0.1:3306/test",
    SENTRY_DSN: "https://publickey@sentry.invalid/1",
    SENTRY_ENVIRONMENT: "staging",
  });
  initSentry(env, {
    transport: (options) =>
      Sentry.createTransport(options, async (request) => {
        await sleep(deliveryDelayMs);
        delivered.push(...eventsIn(request.body));
        return { statusCode: 200 };
      }),
  });
  return { delivered, reset: () => delivered.splice(0) };
}
