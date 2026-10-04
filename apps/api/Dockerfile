# syntax=docker/dockerfile:1
#
# API image. Build from the repo root so the workspace is visible:
#   docker build -f apps/api/Dockerfile -t cdo-api .
# Runs the HTTP server by default; the migration job runs the same image with
# the argument dist/database/migrate.js. Design: docs/design/deployment.md §1.

# Pinned by digest; Dependabot proposes bumps.
FROM node:24-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    HUSKY=0 \
    CI=1 \
    TURBO_TELEMETRY_DISABLED=1
# The exact pnpm from package.json's packageManager field.
RUN corepack enable
WORKDIR /repo

# 1. Only this app and its workspace dependencies: manifests + lockfile in
#    out/json, sources in out/full. Keep turbo's version in sync with package.json.
FROM base AS prune
COPY . .
RUN pnpm dlx turbo@2.11.7 prune @cdo/api --docker

# 2. Install from the lockfile (this layer is reused until a manifest changes),
#    build, then gather production dependencies into one self-contained folder.
FROM base AS build
COPY --from=prune /repo/out/json/ ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm install --frozen-lockfile --store-dir /pnpm-store
COPY --from=prune /repo/out/full/ ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm exec turbo run build --filter=@cdo/api \
    && pnpm --filter=@cdo/api deploy --prod --store-dir /pnpm-store /prod/api

# 3. Runtime: no shell, no package manager, non-root (UID 65532).
FROM gcr.io/distroless/nodejs24-debian13:nonroot@sha256:9eeb7f5887d0e239e78264b06f7f11d2e14be534050481803a9e4728fcdd278e AS runtime
ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app
# Owned by root and only readable by the app's user: the code can't rewrite itself.
COPY --from=build /prod/api ./
USER nonroot
EXPOSE 8080
# The entrypoint is node; the migration job swaps only this argument.
CMD ["dist/main.js"]
