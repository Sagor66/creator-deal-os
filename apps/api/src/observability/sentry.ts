import { minimalDataCollection, scrubBreadcrumb, scrubEvent } from "@cdo/observability";
import * as Sentry from "@sentry/node";
import type { Env } from "../config/env.js";

/**
 * Error tracking for the API and its jobs (docs/design/observability.md §2).
 * Errors only: no tracing, no local variables, and every event and breadcrumb
 * scrubbed before it leaves the process.
 */

/** Replaced by explicit code: our process handlers capture, flush, then exit. */
const REMOVED_INTEGRATIONS = new Set([
  "OnUncaughtException",
  "OnUnhandledRejection",
  // A whole-process "session" means nothing for a long-running server.
  "ProcessSession",
]);

/** Long enough to deliver over a slow link; short enough to stay inside Cloud Run's shutdown window. */
export const FLUSH_TIMEOUT_MS = 2_000;

type SentryEnv = Pick<Env, "SENTRY_DSN" | "SENTRY_ENVIRONMENT" | "APP_VERSION">;

export function sentryOptions(env: SentryEnv): Sentry.NodeOptions {
  return {
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT,
    release: env.APP_VERSION,
    // v11's defaults collect user info, cookies, headers, bodies, query strings and locals.
    dataCollection: minimalDataCollection(),
    integrations: (defaults) =>
      defaults.filter((integration) => !REMOVED_INTEGRATIONS.has(integration.name)),
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
  };
}

/**
 * Starts reporting when a DSN is configured; returns whether it's on. Without a
 * DSN every Sentry call below is a no-op, so local dev and tests need nothing.
 */
export function initSentry(env: SentryEnv, overrides: Partial<Sentry.NodeOptions> = {}): boolean {
  if (env.SENTRY_DSN === undefined) return false;
  Sentry.init({ ...sentryOptions(env), ...overrides });
  return true;
}

/**
 * Report and wait for delivery. Cloud Run throttles CPU once a response is sent
 * (request-based billing), so a background send could stall until the next
 * request, or never happen.
 */
export async function reportError(
  error: unknown,
  context: { tags?: Record<string, string> } = {},
): Promise<void> {
  Sentry.captureException(error, context.tags === undefined ? undefined : { tags: context.tags });
  await Sentry.flush(FLUSH_TIMEOUT_MS);
}
