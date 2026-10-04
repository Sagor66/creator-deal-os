import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { serverEnv } from "@/env";
import { ThrowButtons } from "./throw-buttons";

export const metadata: Metadata = {
  title: "Error reporting check",
  robots: { index: false, follow: false },
};

/**
 * Deliberate test errors (docs/runbooks/monitoring-and-alerts.md). Exists only when
 * DEBUG_PAGES_ENABLED=true: on in staging, off in production unless you switch
 * it on temporarily. Anyone can already send events to the public DSN, so
 * this adds no new exposure.
 */
export default async function DebugErrorsPage() {
  await connection();
  if (!serverEnv.DEBUG_PAGES_ENABLED) notFound();

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Error reporting check</h1>
      <p className="text-neutral-600">
        Each button raises a <code>DeliberateTestError</code>. Within a minute it should appear in
        Sentry under release <code>{serverEnv.APP_VERSION}</code>, with a readable stack trace
        (source maps), and send an email if this environment&apos;s alert rule is on.
      </p>
      <ThrowButtons />
    </main>
  );
}
