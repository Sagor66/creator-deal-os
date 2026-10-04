import type { Metadata } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./globals.css";
import { Geist } from "next/font/google";
import { serverEnv } from "@/env";
import { SENTRY_CONFIG_ELEMENT_ID, serializeClientConfig } from "@/lib/sentry";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Creator Deal OS",
  description: "Run your brand deals from first message to paid invoice.",
};

/** Browser error-reporting config from the *runtime* env (one image, two environments). */
function sentryClientConfig(): string | undefined {
  const { SENTRY_DSN, SENTRY_ENVIRONMENT, APP_VERSION } = serverEnv;
  if (SENTRY_DSN === undefined || SENTRY_ENVIRONMENT === undefined) return undefined;
  return serializeClientConfig({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: APP_VERSION,
  });
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Render at request time, so every page (even a 404) carries this environment's config
  // rather than whatever env existed at build time.
  await connection();
  const sentryConfig = sentryClientConfig();

  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="min-h-dvh antialiased">
        {sentryConfig && (
          <script
            id={SENTRY_CONFIG_ELEMENT_ID}
            type="application/json"
            // Not executable (application/json), and serializeClientConfig escapes "<".
            dangerouslySetInnerHTML={{ __html: sentryConfig }}
          />
        )}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
