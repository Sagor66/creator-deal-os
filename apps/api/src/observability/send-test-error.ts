/**
 * Sends one deliberate error to Sentry to prove the whole chain: SDK → Sentry →
 * alert rule → your inbox (docs/runbooks/monitoring-and-alerts.md).
 *
 * In a deployed environment it runs inside the migrate job's image and env, so
 * it uses the real DSN, environment and release, and only someone with Google
 * Cloud access can trigger it:
 *   gcloud run jobs execute migrate --args=dist/observability/send-test-error.js --wait ...
 * Locally: SENTRY_DSN=... SENTRY_ENVIRONMENT=development node dist/observability/send-test-error.js
 */
import * as Sentry from "@sentry/node";
import { loadEnvOrExit } from "../config/env.js";
import { createLogger } from "../logging/logger.js";
import { initSentry } from "./sentry.js";

class DeliberateTestError extends Error {
  override readonly name = "DeliberateTestError";
}

const env = loadEnvOrExit();
const logger = createLogger(env).child({ job: "send-test-error" });

if (!initSentry(env)) {
  logger.error("SENTRY_DSN is not set, so there is nothing to test");
  process.exitCode = 1;
} else {
  const environment = env.SENTRY_ENVIRONMENT ?? "unknown";
  const eventId = Sentry.captureException(
    new DeliberateTestError(
      `Deliberate test error from ${environment} (release ${env.APP_VERSION}). Safe to resolve.`,
    ),
    {
      tags: { deliberate_test: "true" },
      // One issue per environment: repeats don't spam "new issue" alerts. Resolve it
      // before the next test and the regression alert fires instead.
      fingerprint: ["deliberate-test-error", environment],
    },
  );
  if (await Sentry.flush(5_000)) {
    logger.info({ eventId, environment }, "test error delivered; check Sentry and your inbox");
  } else {
    logger.error({ eventId }, "test error not delivered within 5 s (DSN, network?)");
    process.exitCode = 1;
  }
}
