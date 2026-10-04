"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Last-resort boundary: replaces the root layout when rendering itself fails.
 * Reports the error, then shows a plain page (no app styles are guaranteed here).
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1rem", maxWidth: "36rem" }}
      >
        <h1>Something went wrong</h1>
        <p>The error has been reported. Reload the page to try again.</p>
      </body>
    </html>
  );
}
