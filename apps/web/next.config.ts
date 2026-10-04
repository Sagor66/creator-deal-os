import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

// `next build` and `next start` run with NODE_ENV=production; `next dev` doesn't,
// so HSTS can never stick to http://localhost.
const isProduction = process.env.NODE_ENV === "production";

// Source maps are built and uploaded only when CI provides a token (the Docker build
// gets it as a BuildKit secret). Without one (PR CI, local) none are generated, so
// none can ever be served (docs/design/observability.md §5).
const org = process.env["SENTRY_ORG"];
const project = process.env["SENTRY_PROJECT"];
const authToken = process.env["SENTRY_AUTH_TOKEN"];
const release = process.env["SENTRY_RELEASE"];
const uploadSourceMaps = Boolean(authToken);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // A self-contained server (server.js + only the traced node_modules) for the
  // Docker image (docs/design/deployment.md §1).
  output: "standalone",
  // Trace from the repo root, so workspace packages and pnpm's symlinked store are included.
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  headers() {
    if (!isProduction) return Promise.resolve([]);
    return Promise.resolve([
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ]);
  },
};

export default withSentryConfig(nextConfig, {
  // Only what's set: CI passes all four to the Docker build; locally none exist.
  ...(org !== undefined && { org }),
  ...(project !== undefined && { project }),
  ...(authToken !== undefined && { authToken }),
  // The deployed commit, the same value the SDK reports at runtime (APP_VERSION).
  ...(release !== undefined && { release: { name: release } }),
  sourcemaps: {
    disable: !uploadSourceMaps,
    // Client maps are deleted after upload: they live in Sentry, never under /_next/static.
    deleteSourcemapsAfterUpload: true,
  },
  widenClientFileUpload: true,
  telemetry: false,
  silent: !process.env["CI"],
});
