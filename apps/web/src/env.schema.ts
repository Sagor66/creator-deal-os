import { z } from "zod";

/** Pure and testable; `src/env.ts` applies it to the real environment, server-side only. */
export const ServerEnvSchema = z.object({
  API_URL: z.url().default("http://localhost:3001"),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const apiUrl = source["API_URL"];
  return ServerEnvSchema.parse({ API_URL: apiUrl === "" ? undefined : apiUrl });
}
