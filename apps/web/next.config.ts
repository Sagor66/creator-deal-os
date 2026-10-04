import path from "node:path";
import type { NextConfig } from "next";

// `next build` and `next start` run with NODE_ENV=production; `next dev` doesn't,
// so HSTS can never stick to http://localhost.
const isProduction = process.env.NODE_ENV === "production";

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

export default nextConfig;
