# syntax=docker/dockerfile:1
#
# Web image. Build from the repo root so the workspace is visible:
#   docker build -f apps/web/Dockerfile -t cdo-web .
# Design: docs/design/deployment.md §1.

# Pinned by digest; Dependabot proposes bumps.
FROM node:24-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    HUSKY=0 \
    CI=1 \
    TURBO_TELEMETRY_DISABLED=1 \
    NEXT_TELEMETRY_DISABLED=1
# The exact pnpm from package.json's packageManager field.
RUN corepack enable
WORKDIR /repo

# 1. Only this app and its workspace dependencies. Keep turbo's version in sync with package.json.
FROM base AS prune
COPY . .
RUN pnpm dlx turbo@2.11.7 prune @cdo/web --docker

# 2. Install from the lockfile (reused until a manifest changes), then build.
#    output: "standalone" leaves server.js plus only the node_modules it traced.
FROM base AS build
COPY --from=prune /repo/out/json/ ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm install --frozen-lockfile --store-dir /pnpm-store
COPY --from=prune /repo/out/full/ ./
# With a token, @sentry/nextjs uploads source maps and deletes the client ones
# (docs/design/observability.md §5). The token is a BuildKit secret, never an ARG;
# without one (PR CI, local builds) no maps are generated at all.
ARG APP_VERSION=dev
ARG SENTRY_ORG=""
ARG SENTRY_PROJECT=""
RUN --mount=type=secret,id=sentry_auth_token,required=false \
    if [ -s /run/secrets/sentry_auth_token ]; then \
      export SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token)"; \
    fi \
    && SENTRY_RELEASE="$APP_VERSION" SENTRY_ORG="$SENTRY_ORG" SENTRY_PROJECT="$SENTRY_PROJECT" \
       pnpm exec turbo run build --filter=@cdo/web \
    && mkdir -p /out/cache

# 3. Runtime: no shell, no package manager, non-root (UID 65532).
FROM gcr.io/distroless/nodejs24-debian13:nonroot@sha256:9eeb7f5887d0e239e78264b06f7f11d2e14be534050481803a9e4728fcdd278e AS runtime
ENV NODE_ENV=production \
    PORT=8080 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
# Root-owned and read-only to the app's user...
COPY --from=build /repo/apps/web/.next/standalone ./
# ...except standalone doesn't include static assets, so they're copied in,
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
# and Next's runtime cache is the one directory the app's user may write.
COPY --from=build --chown=65532:65532 /out/cache ./apps/web/.next/cache
USER nonroot
EXPOSE 8080
CMD ["apps/web/server.js"]
