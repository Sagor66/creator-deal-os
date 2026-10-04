import { z } from "zod";

const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

const DEFAULT_LOG_LEVEL = {
  development: "debug",
  test: "silent",
  production: "info",
} as const satisfies Record<string, LogLevel>;

function isMysqlUrl(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return url.protocol === "mysql:" && url.hostname !== "" && url.pathname.length > 1;
}

const PEM_CERTIFICATE = /-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----/;

/** Some secret stores flatten a PEM's newlines to a literal "\n"; put them back. */
function restoreNewlines(value: string): string {
  return value.includes("\n") ? value : value.replaceAll("\\n", "\n");
}

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    APP_VERSION: z.string().min(1).default("dev"),
    DATABASE_URL: z
      .string()
      .refine(isMysqlUrl, "must look like mysql://user:password@host:3306/database"),
    LOG_LEVEL: z.enum(LOG_LEVELS).optional(),
    LOG_FORMAT: z.enum(["json", "pretty"]).optional(),
    // z.coerce.boolean() would turn "false" into true; stringbool parses it properly.
    TRUST_PROXY: z.stringbool().default(false),
    SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(10_000),
    // TLS to MySQL (docs/design/deployment.md §2). There is deliberately no
    // "encrypt but don't verify" mode: it gives no protection against interception.
    DATABASE_TLS: z.enum(["off", "verify"]).optional(),
    // The CA that signed the server's certificate (Aiven uses a per-project CA).
    DATABASE_CA_CERT: z
      .string()
      .transform(restoreNewlines)
      .refine((value) => PEM_CERTIFICATE.test(value), "must be a PEM certificate")
      .optional(),
    // Error tracking (docs/design/observability.md). No DSN = reporting off (local, tests).
    // The DSN isn't a secret: it only lets you send events.
    SENTRY_DSN: z.url({ protocol: /^https?$/ }).optional(),
    SENTRY_ENVIRONMENT: z.enum(["development", "staging", "production"]).optional(),
  })
  .transform((env) => ({
    ...env,
    LOG_LEVEL: env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL[env.NODE_ENV],
    LOG_FORMAT: env.LOG_FORMAT ?? (env.NODE_ENV === "development" ? "pretty" : "json"),
    // Secure by default where it matters: production verifies unless told otherwise.
    DATABASE_TLS: env.DATABASE_TLS ?? (env.NODE_ENV === "production" ? "verify" : "off"),
  }))
  .superRefine((env, ctx) => {
    // One image runs as staging and as production, so the label must be explicit.
    if (env.SENTRY_DSN !== undefined && env.SENTRY_ENVIRONMENT === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["SENTRY_ENVIRONMENT"],
        message: "is required when SENTRY_DSN is set (staging | production | development)",
      });
    }
    if (env.DATABASE_CA_CERT !== undefined && env.DATABASE_TLS === "off") {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_CA_CERT"],
        message: "is set, but DATABASE_TLS is off; set DATABASE_TLS=verify or remove it",
      });
    }
  });

export type Env = z.output<typeof EnvSchema>;

/** DI token for the parsed env, so nothing else ever reads `process.env`. */
export const ENV = Symbol("ENV");

/** Every problem at once, by key and reason. Never includes the values: they may be secrets. */
export class EnvValidationError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(
      `Invalid environment configuration:\n${problems.map((problem) => `  - ${problem}`).join("\n")}`,
    );
    this.name = "EnvValidationError";
  }
}

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  // Treat `KEY=` the same as an unset KEY, so defaults and "required" apply.
  const input = Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, value === "" ? undefined : value]),
  );
  const result = EnvSchema.safeParse(input);
  if (result.success) return result.data;

  const problems = result.error.issues.map((issue) => {
    const key = issue.path.map(String).join(".") || "(root)";
    const missing = issue.path.length === 1 && input[String(issue.path[0])] === undefined;
    return `${key}: ${missing ? "required" : issue.message}`;
  });
  throw new EnvValidationError(problems);
}

/** For process entrypoints: print every problem (never the values) and exit 1. */
export function loadEnvOrExit(): Env {
  try {
    return loadEnv();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      // Before any logger exists: plain text on stderr, then stop.
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}
