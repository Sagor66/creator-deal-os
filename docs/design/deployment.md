# Design note: deployment (images, pipeline, migrations, environments)

- **Date:** 2026-10-04
- **Issue:** #10 (first deploy with HTTPS)
- **Builds on:**
  - [ADR-005](../adr/005-hosting-and-environments.md): Cloud Run + Aiven MySQL, Phase 0
  - [ADR-001](../adr/001-monorepo-structure.md): one slim image per app
  - [ADR-002](../adr/002-orm-choice.md): Drizzle; migrations run as a release step
  - [api runtime foundations](api-runtime-foundations.md): health, shutdown
- **Status:** implemented in the PR that adds this note

## Goals

| # | Goal | Where |
|---|---|---|
| G1 | Production-grade images: multi-stage, non-root, small, `.dockerignore` | §1 |
| G2 | A merge to `main` deploys staging automatically; production deploys after a manual approval | §4 |
| G3 | Migrations run before the new version serves traffic, and are never destructive by default | §3 |
| G4 | HTTPS on platform URLs now. `app.`, `api.` and staging subdomains as soon as a domain exists | §6 |
| G5 | Readiness wired to the platform: a release that isn't ready never gets traffic | §5 |
| G6 | `docs/runbooks/deploy-and-rollback.md`, plus a checklist of what the founder sets up by hand | runbook |
| G7 | No long-lived secrets in GitHub, the repo, CI logs or images | §4, §5 |

**Not in scope:**
- a custom domain (none is bought yet: ADR-005)
- Redis (M4), storage (M3) and email (M2)
- infrastructure as code (§9)

## 1. Images

**One Dockerfile per app, built from the repo root** (so the workspace is visible): `apps/api/Dockerfile` and `apps/web/Dockerfile`.

| Stage | Base | What happens |
|---|---|---|
| `base` | `node:24-slim`, pinned by digest | Enables corepack, so the exact pnpm from `packageManager` is used. Sets `HUSKY=0` and turns telemetry off. |
| `prune` | base | `turbo prune <app> --docker` produces `json/` (the manifests and the lockfile) and `full/` (the sources) for only this app and its workspace dependencies. |
| `build` | base | Copies `json/`, runs `pnpm install --frozen-lockfile` with a BuildKit cache mount on the pnpm store, then copies `full/` and builds with Turborepo. The install layer is reused until a manifest or the lockfile changes. |
| `runtime` | `gcr.io/distroless/nodejs24-debian13:nonroot`, pinned by digest | Only the build output and production dependencies. |

**api runtime:** `pnpm --filter @cdo/api deploy --prod`.
- This produces `dist/`, `drizzle/` (the migrations), `package.json`, and production `node_modules` with `@cdo/schemas` copied in.
- Verified locally: 36 MB of dependencies, and `node dist/main.js` boots.
- `"files": ["dist", "drizzle"]` keeps `src/` and the tests out.

**web runtime:** Next's `output: "standalone"`.
- `server.js` and only the traced `node_modules`.
- Plus `.next/static` and `public/`, which standalone doesn't copy.
- `outputFileTracingRoot` points at the repo root, so pnpm's symlinked dependencies are traced.

**Why distroless and not `node:slim` at runtime:**
- No shell, no package manager, and nothing else to exploit or patch.
- The `nonroot` variant runs as UID 65532.
- Cloud Run doesn't need a shell: probes are HTTP.
- **The cost:** you can't `docker exec sh` into a running container. You debug through logs, or locally with the `:debug-nonroot` variant.

**Signals:**
- Node is PID 1 (`ENTRYPOINT ["/nodejs/bin/node"]`).
- Both apps install their own SIGTERM handlers: Nest's `enableShutdownHooks`, and Next's standalone server.
- So nothing like `tini` is needed: no child processes are spawned and none need reaping.
- **Verified locally with `docker stop`:**
  - The api drains, logs "shutdown complete" and exits 0 within about 1 s.
  - The web server exits at once with 143, the signal code; Next exits on SIGTERM. It never waits out the 10 s kill.

**`.dockerignore`** excludes:
- `node_modules`, `dist`, `.next` and `.turbo`
- `.git`, docs and `.notes`
- **every `.env*`**, so a local secret can never reach the build context

**Supply chain:**
- Both base images are pinned by digest, and Dependabot (`docker` ecosystem) proposes digest bumps weekly.
- Images are built for `linux/amd64`, which is what Cloud Run runs.

## 2. Config: TLS to the database

Aiven presents a certificate signed by **its own per-project CA**, so the API must be given that CA to verify the server.

| Variable | Default | Rule |
|---|---|---|
| `DATABASE_TLS` | `verify` in production, `off` elsewhere | `off` \| `verify`. `verify` means TLS 1.2+ and `rejectUnauthorized: true`. |
| `DATABASE_CA_CERT` | none | PEM. When set, it's the trusted CA. Without it, `verify` uses Node's built-in CAs. |

**The rules:**
- **Production defaults to verified TLS.**
  - Plain-text MySQL in production takes an explicit `DATABASE_TLS=off`.
  - Only the CI container smoke test sets that, against a throwaway MySQL on the runner.
  - "Encrypt but don't verify" (`rejectUnauthorized: false`) is deliberately **not offered**: it gives no protection against someone in the middle.
- **One shared builder:** `buildConnectionOptions(env)` is used by both the API's pool and the migration runner, so they can't drift apart.

## 3. Migrations

### Runner: `apps/api/src/database/migrate.ts`
It ships in the API image and runs as the Cloud Run **job** `migrate`.

1. **Validates the config,** opens one connection (TLS as in §2), and logs JSON like the API.
2. **Takes a MySQL advisory lock:** `GET_LOCK('cdo:migrate', 120)`.
   - Two runs (the pipeline plus someone running it by hand) can never apply migrations at the same time.
   - If it can't get the lock within 120 s, it exits 1.
3. **Runs the safety check** (below) over **every** migration file, and exits 1 on any violation **before touching the schema**.
4. **Runs Drizzle's `migrate()`** (`drizzle-orm/mysql2/migrator`), which applies pending files in order and records them in `__drizzle_migrations`.
5. **Logs how many migrations were applied**, by counting rows before and after, then releases the lock and exits 0.
   - Any error exits 1, and the pipeline stops before deploying.

**Why a job, not "migrate on boot":**
- With autoscaling, several instances would race to migrate.
- A failed migration would crash-loop the service instead of failing the deploy.
- The API's runtime user would need DDL rights.

ADR-002 already says "a release step, not on every app boot".

### Never destructive by default
`migration-safety.ts` flags every statement that can lose data or break the version that's still running:
- `DROP TABLE` / `DATABASE` / `SCHEMA` / `VIEW`
- `TRUNCATE`
- `DELETE FROM`
- `ALTER TABLE … DROP <column>` (with or without the `COLUMN` keyword)
- `RENAME TABLE`, and `ALTER TABLE … RENAME` (but not `RENAME INDEX` or `RENAME KEY`)
- `ALTER TABLE … MODIFY` / `CHANGE`: a type change can truncate data, and a rename breaks running code

Dropping an index, key, foreign key or check isn't data loss, so it isn't flagged.

**A flagged statement passes only if its own chunk contains `-- allow-destructive: <reason>`** (at least 10 characters), written in the PR and reviewed there. The check runs in two places:
1. **At PR time:** a unit test runs it over the real `apps/api/drizzle/` folder, so CI fails before merge.
2. **At deploy time:** the runner refuses to start. That catches a migration that reached `main` some other way.

**And in the database itself:** the API connects as a user with only `SELECT, INSERT, UPDATE, DELETE`. Even a bug in the API can't drop a table. Only `migrate` runs as the DDL user.

### Expand/contract: the rule that makes deploys and rollbacks safe
**During a deploy, the old API version serves traffic while migrations run.** So every migration must work with **both** the old and the new code:
1. **Expand:** add new nullable columns or tables. Deploy code that writes both and reads new-with-fallback.
2. **Backfill.**
3. **Switch** reads to the new structure.
4. **Contract:** drop the old one, in a **later** release, with `-- allow-destructive:` and a reason.

**The payoff:** rolling the code back one release is always safe, because the schema it expects still exists.

### Drizzle setup in this PR
- `drizzle-orm` 0.45.3, pinned exactly (ADR-002).
- The migrations folder `apps/api/drizzle/`, with an empty journal (`meta/_journal.json`).
- The first real schema, the drizzle-kit config and Testcontainers repository tests arrive with the database issue. This PR only builds the runner and proves it in the pipeline.

## 4. Pipeline (`.github/workflows/deploy.yml`)

**Trigger:**
- `workflow_run` of **CI**, completed, on `main`.
- **The job runs only if CI succeeded *and* was a `push` in *this* repository.**
  - `workflow_run`'s branch filter matches the *head branch name*, so a fork's PR from a branch called `main` would otherwise trigger it.
- `workflow_dispatch` with an optional `ref` (a commit on `main`), used to redeploy or roll back.
- **Switched off until setup is done:** the repository variable `DEPLOY_ENABLED=true` gates both. Without it, a merge to `main` would produce a failed deploy every time until the cloud accounts exist.

**Concurrency:**
- Group `deploy`, `cancel-in-progress: false`: a deploy is never cut off halfway.
- A newer queued run replaces an older queued one, so the latest `main` wins.

| Job | GitHub Environment | Steps |
|---|---|---|
| `staging` | `staging` (no reviewers; `main` only) | 1. Authenticate (OIDC). 2. **Build both images once**, push to staging's Artifact Registry, record their **digests**. 3. Point the `migrate` job at the new API digest, run it, and wait. 4. Deploy `api`. 5. Deploy `web`, with `API_URL` set to the new API's URL. 6. Smoke-test. |
| `production` | `production` (**required reviewer: the founder**; `main` only) | Waits for approval. Then: 1. Authenticate as the *production* identity. 2. **Copy the same digests** from staging's registry into production's (`skopeo copy --preserve-digests`). 3. Migrate. 4. Deploy `api`, then `web`. 5. Smoke-test. |

**Promotion is by digest, never by rebuild or tag.**
- Production runs byte-for-byte what staging tested.
- **The digests prove it:** the job checks that each copied digest equals the one staging deployed.

**Identity: no keys anywhere.**
- GitHub's OIDC token is exchanged through **Workload Identity Federation** for a short-lived token of the environment's `deployer` service account.
- **Each project's provider accepts only:**
  - tokens whose `repository_id` is this repo's (it's numeric, so renaming or recreating a repo can't take it over)
  - **and** whose `environment` is that project's: `staging` or `production`
- **The result:** a PR, a fork, a branch or the staging job **cannot** get production credentials. Only a job that ran in the approved `production` environment can.
- **What GitHub stores:** only non-secret **environment variables** (project ID, region, provider name, deployer email). **There are no GitHub secrets.**

**Smoke test** (`scripts/smoke-test.sh`), retried to absorb cold starts:
- **api:**
  - `/health` returns 200
  - `/health/ready` returns 200 with `"status":"ready"`
  - `/meta.version` is the deployed commit
- **web:**
  - `/api/health` returns 200
  - `/` returns 200, shows the deployed version and "ready", and sends `Strict-Transport-Security`

## 5. Cloud Run configuration (`infra/cloudrun/*.yaml`)

Declarative service and job manifests, rendered with `envsubst` (an explicit variable list, so nothing else gets substituted). They're applied with `gcloud run services replace` / `jobs replace`, which also catches drift made by hand in the console.

| | api | web | migrate (job) |
|---|---|---|---|
| **Image** | API digest | web digest | API digest; args `dist/database/migrate.js` |
| **Service account** | `api-runtime`: reads `api-database-url` and `database-ca-cert` only | `web-runtime`: **no permissions** | `migrate-runtime`: reads `migrate-database-url` and `database-ca-cert` only |
| **Startup probe** | `GET /health/ready`, every 2 s, up to 60 s | `GET /api/health` | n/a (a 300 s task timeout, 0 retries) |
| **Liveness probe** | `GET /health`, every 15 s, 3 failures | `GET /api/health` | n/a |
| **Scaling** | min 0, **max 2** | min 0, **max 2** | 1 task |
| **CPU / memory** | 1 vCPU / 512 MiB, startup CPU boost, request-based billing | same | 1 / 512 MiB |
| **Env** | `NODE_ENV=production`, `APP_VERSION`, `TRUST_PROXY=true`, `SHUTDOWN_TIMEOUT_MS=8000` | `API_URL` (the API's `run.app` URL). The image sets `NODE_ENV` and `HOSTNAME=0.0.0.0`. | `NODE_ENV=production`, `APP_VERSION` |

**Readiness gates the release (G5):**
1. A new revision's startup probe calls `/health/ready`.
2. If MySQL is unreachable or the app can't boot, the probe never passes and the revision never becomes ready.
3. `services replace` fails, the pipeline stops, and **the previous revision keeps serving 100% of traffic**.

Cloud Run's continuous readiness probe is Beta, so we don't use it (ADR-005).

**The other settings:**
- **`SHUTDOWN_TIMEOUT_MS=8000`** finishes draining inside Cloud Run's 10 s between SIGTERM and SIGKILL.
- **Max instances are capped**, so a traffic spike or a loop can't run up a bill on the free tier.
- **Dedicated service accounts:** Cloud Run's default identity is the Compute Engine service account, which holds broad *Editor* rights. Every workload gets its own service account with only what it needs.

## 6. Domains and HTTPS

**Now:**
- `https://api-<project-number>.europe-west4.run.app` and `https://web-…`.
  - Google terminates TLS, and plain HTTP is never served.
  - `.app` is on browsers' HSTS preload list, so browsers won't even try HTTP.
- **The web app sends its own HSTS header** in production: `max-age=63072000; includeSubDomains`. It isn't sent in development, so it can't poison `localhost`.

**When a domain exists (checklist in the runbook):**

| Environment | Web | API |
|---|---|---|
| production | `app.<domain>` | `api.<domain>` |
| staging | `staging.<domain>` | `api.staging.<domain>` |

- **How:**
  - **Cloud Run domain mappings** (Preview; free; managed certificates; `europe-west4` is supported): a `CNAME` to `ghs.googlehosted.com`, after verifying the domain.
  - **Phase 2 production** moves to a global load balancer (ADR-005).
- **The smoke test** uses the GitHub environment variables `PUBLIC_WEB_URL` and `PUBLIC_API_URL` when they're set, and falls back to the `run.app` URLs. The switch is configuration only.
- **The web server's `API_URL`** always stays on the API's `run.app` URL. It's a server-to-server hop, and it doesn't need the public name.
- **Staging lives under its own `staging.` subtree.** Production cookies (M2) are host-only, on `app.<domain>`, so the two environments' sessions can't leak into each other.

## 7. Rollback

1. **Instant, code only:** `gcloud run services update-traffic api --to-revisions=<previous>=100`, then the same for `web`.
   - The old revision is still there, so this takes seconds.
   - The next deploy sends traffic back to the latest revision (`latestRevision: true`).
2. **To a known commit:** run **Deploy** with `ref=<sha>`. That rebuilds that commit and goes through staging and approval as normal.
3. **The schema is never rolled back.** Thanks to expand/contract, older code runs against the newer schema.
   - A *bad* migration is fixed **forward** with a new migration.
   - MySQL commits DDL implicitly, so a migration that failed halfway is inspected by hand (runbook) before a corrective migration is written.
   - **There is no point-in-time recovery in Phase 0** (ADR-005).

## 8. Testing

| What | How |
|---|---|
| **Migration safety rules** | Unit tests for every pattern, both flagged and acknowledged. Plus the "real folder passes" test. |
| **TLS options builder and env rules** | Unit tests. |
| **The runner** (lock, counts, refusal) | Unit tests with a fake connection. Then the real thing in the CI container smoke test, against MySQL 8.4. |
| **The images** | A new CI job `images` builds both images on every PR and then: (1) runs `migrate` against a MySQL 8.4 service, (2) starts the api and checks `/health/ready` returns 200, (3) starts the web app and checks the page shows "ready" and sends HSTS, (4) checks both run as a non-root user, and (5) prints both image sizes. |
| **Readiness on the page** | Unit tests for `getReadiness()`; the shared zod schema is tested in `packages/schemas`. |
| **Not testable without the founder's cloud accounts** | WIF, `gcloud run … replace`, `skopeo` promotion, and the bootstrap script. The first real run is the founder's first deploy, following the runbook. That's stated in the PR. |

## 9. Alternatives rejected

| Alternative | Why not |
|---|---|
| Migrate on app boot | Instances race each other, a failed migration crash-loops the service instead of failing the deploy, and the API user would need DDL rights. |
| Production deploys triggered by a release tag | Anyone who can push a tag could deploy. A GitHub Environment approval is an auditable gate, and it's free on public repos. Tags can still mark releases. |
| Rebuilding for production | The bytes would differ from what staging tested. Promoting by digest makes "tested" mean something. |
| A JSON service-account key in GitHub secrets | A long-lived credential that can leak. WIF issues short-lived tokens bound to the repo and environment. |
| Cloud Build | Another place for logs and permissions. GitHub Actions already runs CI, so one tool covers both. |
| Terraform now | The resources are few, and the bootstrap script is idempotent and readable. Terraform comes with Phase 1/2, when Cloud SQL and the load balancer arrive (ADR-005). |
| `node:slim` at runtime | It has a shell and a package manager we don't need. Distroless `nonroot` is smaller and safer, and Cloud Run doesn't need a shell. |
| The Cloud Run readiness probe | Beta. Startup probe gating covers releases (§5). |

## 10. Risks

- **The first real deploy is unverified** until the founder's accounts exist. The runbook's first-deploy steps double as its test plan.
- **Aiven powers off an idle free service,** which blocks deploys at readiness. The runbook says how to power it back on.
- **`skopeo` comes from GitHub's runner image.** If it ever disappears, promotion fails loudly; the fallback is `crane`.
- **Artifact Registry's 0.5 GB free allowance:** cleanup policies keep the 3 newest versions of each image per project. Expect cents at most.
