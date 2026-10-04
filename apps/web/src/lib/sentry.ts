import { minimalDataCollection, scrubBreadcrumb, scrubEvent } from "@cdo/observability";
import { z } from "zod";

/**
 * Shared by the browser and the Next.js server (docs/design/observability.md §3):
 * the same release/environment tagging, data-collection policy and scrubbing.
 * Errors only: no tracing, no session replay.
 */

/** What the browser needs, rendered by the root layout from the server's runtime env. */
export const SentryClientConfigSchema = z.object({
  dsn: z.url({ protocol: /^https?$/ }),
  environment: z.enum(["development", "staging", "production"]),
  release: z.string().min(1),
});

export type SentryClientConfig = z.infer<typeof SentryClientConfigSchema>;

/** The element id the root layout renders the config under. */
export const SENTRY_CONFIG_ELEMENT_ID = "sentry-config";

export function sentryOptions(config: SentryClientConfig) {
  return {
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    // Sentry v11 collects user info, cookies, headers, bodies and query strings by default.
    dataCollection: minimalDataCollection(),
    beforeSend: <T extends object>(event: T) => scrubEvent(event),
    beforeBreadcrumb: <T extends object>(breadcrumb: T) => scrubBreadcrumb(breadcrumb),
  };
}

/**
 * Serialises the config for `<script type="application/json">`. JSON isn't
 * executed, and escaping `<` means no value can ever close the script tag.
 */
export function serializeClientConfig(config: SentryClientConfig): string {
  return JSON.stringify(config).replace(/</g, "\\u003c");
}

/** Reads the config back in the browser; anything malformed means "no reporting". */
export function parseClientConfig(json: string | null | undefined): SentryClientConfig | undefined {
  if (!json) return undefined;
  try {
    const parsed = SentryClientConfigSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}
