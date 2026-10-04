import * as Sentry from "@sentry/nextjs";
import { parseServerEnv } from "./env.schema";
import { sentryOptions } from "./lib/sentry";

// Loaded by instrumentation.ts in the Node.js runtime. Runtime env, so the same
// image reports as staging or production (docs/design/observability.md §3).
const env = parseServerEnv(process.env);

if (env.SENTRY_DSN !== undefined && env.SENTRY_ENVIRONMENT !== undefined) {
  Sentry.init(
    sentryOptions({
      dsn: env.SENTRY_DSN,
      environment: env.SENTRY_ENVIRONMENT,
      release: env.APP_VERSION,
    }),
  );
}
