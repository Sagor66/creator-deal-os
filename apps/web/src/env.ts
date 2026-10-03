import { z } from "zod";

/**
 * Minimal server-side config for the scaffold. Issue #7 extends this into the
 * full env validation, including the browser-safe `NEXT_PUBLIC_*` split.
 */
const ServerEnvSchema = z.object({
  API_URL: z.url().default("http://localhost:3001"),
});

export const serverEnv = ServerEnvSchema.parse({ API_URL: process.env["API_URL"] });
