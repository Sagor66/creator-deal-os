"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeliberateTestError } from "@/lib/deliberate-test-error";

export function ThrowButtons() {
  const [serverResult, setServerResult] = useState<string>();

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="outline"
        className="self-start"
        onClick={() => {
          // Unhandled on purpose: proves Sentry's global browser handler, not a manual capture.
          throw new DeliberateTestError("Deliberate browser test error. Safe to resolve.");
        }}
      >
        Throw in the browser
      </Button>
      <Button
        variant="outline"
        className="self-start"
        onClick={() => {
          void fetch("/debug/errors/server", { cache: "no-store" }).then((response) => {
            setServerResult(`The server answered ${String(response.status)}.`);
          });
        }}
      >
        Throw on the server
      </Button>
      {serverResult && <p role="status">{serverResult} Check Sentry for the event.</p>}
    </div>
  );
}
