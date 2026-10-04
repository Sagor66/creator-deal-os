import Link from "next/link";
import { connection } from "next/server";
import { Button } from "@/components/ui/button";
import { serverEnv } from "@/env";
import { getServiceInfo } from "@/lib/api";

export default async function HomePage() {
  // Render on every request: the API is checked at request time, never baked in at build.
  await connection();
  const status = await getServiceInfo(serverEnv.API_URL);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Creator Deal OS</h1>
      <p className="text-neutral-600">Scaffold check: the web app calls the API and validates the answer with the shared schema.</p>
      {status.ok ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border p-4 text-sm">
          <dt className="text-neutral-500">API</dt>
          <dd>{status.info.service}</dd>
          <dt className="text-neutral-500">Version</dt>
          <dd>{status.info.version}</dd>
          <dt className="text-neutral-500">Server time</dt>
          <dd>{status.info.time}</dd>
        </dl>
      ) : (
        <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {status.reason}. Start it with <code>pnpm dev</code>.
        </p>
      )}
      <Button asChild variant="outline" className="self-start">
        <Link href="/">Check again</Link>
      </Button>
    </main>
  );
}
