import * as Sentry from "@sentry/nextjs";

export async function register(): Promise<void> {
  // eslint-disable-next-line no-restricted-properties -- set by Next itself, not app config
  if (process.env["NEXT_RUNTIME"] === "nodejs") await import("./sentry.server.config");
}

/**
 * Server errors in pages, route handlers and server actions. Flushed before
 * returning: Cloud Run throttles CPU once the response is out, so a background
 * send could stall (docs/design/observability.md §3).
 */
export async function onRequestError(
  ...args: Parameters<typeof Sentry.captureRequestError>
): Promise<void> {
  Sentry.captureRequestError(...args);
  await Sentry.flush(2_000);
}
