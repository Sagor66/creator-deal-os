import { z } from "zod";

/** Pure and testable; `src/env.ts` applies it to the real environment, server-side only. */
export const ServerEnvSchema = z
  .object({
    API_URL: z.url().default("http://localhost:3001"),
    // The deployed commit; also the Sentry release (docs/design/observability.md).
    APP_VERSION: z.string().min(1).default("dev"),
    // Error tracking. No DSN = off (local dev, tests). The DSN isn't a secret.
    SENTRY_DSN: z.url({ protocol: /^https?$/ }).optional(),
    SENTRY_ENVIRONMENT: z.enum(["development", "staging", "production"]).optional(),
    // /debug/errors (deliberate test errors). On in staging, off in production.
    DEBUG_PAGES_ENABLED: z.stringbool().default(false),
  })
  .superRefine((env, ctx) => {
    // One image runs as staging and as production, so the label must be explicit.
    if (env.SENTRY_DSN !== undefined && env.SENTRY_ENVIRONMENT === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["SENTRY_ENVIRONMENT"],
        message: "is required when SENTRY_DSN is set",
      });
    }
  });

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

const KEYS = Object.keys(ServerEnvSchema.shape) as (keyof ServerEnv)[];

/** Treats `KEY=` like an unset KEY, so defaults apply. */
export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const input = Object.fromEntries(
    KEYS.map((key) => [key, source[key] === "" ? undefined : source[key]]),
  );
  return ServerEnvSchema.parse(input);
}
