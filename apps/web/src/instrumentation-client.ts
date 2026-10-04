import * as Sentry from "@sentry/nextjs";
import { parseClientConfig, SENTRY_CONFIG_ELEMENT_ID, sentryOptions } from "./lib/sentry";

/**
 * Browser error reporting. The config (DSN, environment, release) comes from a
 * JSON script the root layout renders from the server's runtime env, so one
 * image serves both environments. No config = no reporting (local dev).
 */
function start(): void {
  const config = parseClientConfig(document.getElementById(SENTRY_CONFIG_ELEMENT_ID)?.textContent);
  if (config) Sentry.init(sentryOptions(config));
}

// This file can run before the body is parsed; wait for the config element if so.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
