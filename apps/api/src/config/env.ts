import { z } from "zod";

/**
 * Minimal runtime config for the scaffold. Issue #7 extends this into the full
 * fail-fast env validation (every variable, readable errors, tests, lint rule).
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  APP_VERSION: z.string().min(1).default("dev"),
});

export type Env = z.infer<typeof EnvSchema>;

/** DI token for the parsed env, so providers never read `process.env` themselves. */
export const ENV = Symbol("ENV");

export function loadEnv(source: Record<string, string | undefined>): Env {
  return EnvSchema.parse(source);
}
