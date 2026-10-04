import { z } from "zod";

/** One dependency's result. `error` is a short, safe code (e.g. `ECONNREFUSED`), never a message. */
export const CheckResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("up"), durationMs: z.number().int().nonnegative() }),
  z.object({
    status: z.literal("down"),
    durationMs: z.number().int().nonnegative(),
    error: z.string().min(1),
  }),
]);

/**
 * What the API answers at `GET /health/ready`: 200 when ready, 503 otherwise, with
 * this body either way. The web app shows it and the deploy smoke test checks it.
 */
export const ReadinessReportSchema = z.object({
  status: z.enum(["ready", "not_ready", "shutting_down"]),
  checks: z.record(z.string(), CheckResultSchema),
});

export type CheckResult = z.infer<typeof CheckResultSchema>;
export type ReadinessReport = z.infer<typeof ReadinessReportSchema>;
