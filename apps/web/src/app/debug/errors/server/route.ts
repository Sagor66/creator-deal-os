import { serverEnv } from "@/env";
import { DeliberateTestError } from "@/lib/deliberate-test-error";

export const dynamic = "force-dynamic";

/** Throws on the server so onRequestError → Sentry is proven end to end. */
export function GET(): Response {
  if (!serverEnv.DEBUG_PAGES_ENABLED) return new Response("Not found", { status: 404 });
  throw new DeliberateTestError("Deliberate server test error. Safe to resolve.");
}
