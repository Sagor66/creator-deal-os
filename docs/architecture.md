# Architecture

**Status:** Phase 0 of [ADR-005](adr/005-hosting-and-environments.md), checked 2026-10-04.
- **Phase 0 is a personal project on free tiers, with no real user data yet.**
- This file describes the system as it runs today. It names what changes at each later phase and links the decision behind each part.

## The system in one picture

```mermaid
flowchart LR
  user["Creator's browser"]

  subgraph gcp["Google Cloud project, one per environment (europe-west4)"]
    web["web: Cloud Run service<br/>Next.js, server-rendered"]
    api["api: Cloud Run service<br/>NestJS"]
    migrate["migrate: Cloud Run job<br/>same image as api"]
    sm[("Secret Manager<br/>DB URLs, DB CA cert")]
    ar[("Artifact Registry<br/>api and web images")]
  end

  subgraph aiven["Aiven project, one per environment (EU)"]
    db[("MySQL 8.4<br/>verified TLS")]
  end

  gha["GitHub Actions<br/>CI and deploy"]

  user -- "HTTPS" --> web
  web -- "HTTPS, server-side only" --> api
  api -- "DML user" --> db
  migrate -- "DDL user" --> db
  sm -. "env at start-up" .-> api
  sm -. "env at start-up" .-> migrate
  gha -- "push images" --> ar
  gha -- "run migrate, then deploy<br/>(OIDC, no stored keys)" --> gcp
  ar -. "pull by digest" .-> web
  ar -. "pull by digest" .-> api
  ar -. "pull by digest" .-> migrate
```

**Rules this picture encodes:**
- **The browser only talks to `web`.** `web` calls `api` from the server, so the browser never makes a cross-origin request: no CORS, and no third-party cookies once auth arrives (M2).
- **The API connects as a user that can't change the schema.** Only the `migrate` job holds DDL rights.
- **Images are referenced by digest,** so production runs exactly the bytes staging tested.

## Components

| Part | Code | What it does | Decision |
|---|---|---|---|
| **web** | `apps/web` | Next.js App Router. Renders pages and calls the API on the server; its env is validated with zod. Liveness: `GET /api/health`. | [ADR-001](adr/001-monorepo-structure.md) |
| **api** | `apps/api` | NestJS. Owns the database and every business rule. Liveness: `GET /health`. Readiness: `GET /health/ready`, which checks MySQL. | ADR-001, [design note](design/api-runtime-foundations.md) |
| **migrate** | `apps/api/src/database/migrate.ts` | Applies pending migrations under a MySQL lock. Refuses unacknowledged destructive statements. | [ADR-002](adr/002-orm-choice.md), [design note](design/deployment.md) |
| **schemas** | `packages/schemas` | zod contracts shared by api and web (`/meta`, readiness report). | ADR-001 |
| **MySQL** | `compose.yaml` locally; Aiven in deployed environments | MySQL 8.4, UTF-8 (`utf8mb4`), UTC. | ADR-002, [ADR-005](adr/005-hosting-and-environments.md) |

## Environments

```mermaid
flowchart TB
  subgraph local["local (your machine)"]
    l1["pnpm dev: api :3001, web :3000"] --> l2[("compose.yaml<br/>MySQL 8.4, Redis")]
  end

  subgraph staging["staging: own GCP project and own Aiven project"]
    s1["web-...run.app"] --> s2["api-...run.app"] --> s3[("MySQL, staging")]
  end

  subgraph production["production: own GCP project and own Aiven project"]
    p1["web-...run.app"] --> p2["api-...run.app"] --> p3[("MySQL, production")]
  end

  merge["merge to main"] -->|automatic| staging
  staging -->|"manual approval<br/>same image digests"| production
```

| | Local | Staging | Production |
|---|---|---|---|
| **Deployed by** | `pnpm dev` | Every merge to `main`, after CI passes | Manual approval, after staging passed |
| **Data** | Your local database | Made-up data only | Real data (none until M5) |
| **Secrets** | `.env` (git-ignored) | Staging Secret Manager | Production Secret Manager |
| **Stripe** | Test mode | Test mode | Test mode until a company exists (ADR-000) |
| **Cloud identity** | n/a | `staging` GitHub Environment → staging deployer | `production` GitHub Environment (needs approval) → production deployer |

**Separation is enforced, not promised:**
- **Separate projects:** nothing in staging can reach production.
- **Separate deploy credentials:** production's credentials are only issued to a job running in the approved `production` GitHub Environment.
- **No copies of production data:** production data is never copied to staging or local. Restore drills run inside production's own project.

## A request

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser
  participant W as web (Cloud Run)
  participant A as api (Cloud Run)
  participant D as MySQL

  B->>W: GET / (HTTPS)
  Note over W: picks or creates X-Request-Id
  W->>A: GET /meta and GET /health/ready (X-Request-Id)
  A->>D: SELECT 1 (readiness)
  D-->>A: ok
  A-->>W: ServiceInfo, ReadinessReport
  Note over W: validates both with @cdo/schemas
  W-->>B: HTML (HSTS header set)
```

**Following one request:** the request ID appears on every API log line, so you can filter a page view end to end in Cloud Logging.

## A deploy

```mermaid
sequenceDiagram
  autonumber
  participant GH as GitHub Actions
  participant AR as Artifact Registry
  participant J as migrate job
  participant R as Cloud Run (api, web)

  GH->>GH: CI green on main
  GH->>AR: build api and web once, push (staging)
  GH->>J: point the job at the new api digest, run it, wait
  J-->>GH: migrations applied, or the deploy stops here
  GH->>R: deploy api (startup probe = /health/ready)
  R-->>GH: new revision ready, or the old one keeps serving
  GH->>R: deploy web, then smoke-test both
  Note over GH: production waits for manual approval
  GH->>AR: copy the same digests to production
  GH->>J: migrate (production)
  GH->>R: deploy api, then web (production), then smoke-test
```

**Pipeline details** (expand/contract, rollback, secrets): [docs/design/deployment.md](design/deployment.md) and [docs/runbooks/deploy-and-rollback.md](runbooks/deploy-and-rollback.md).

## Cross-cutting rules

- **Config:** each app validates its env with zod at start-up and refuses to boot when it's wrong. Only the env module reads `process.env`.
- **Time:** UTC everywhere: the MySQL session, the logs, the API's ISO-8601 strings.
- **Health:**
  - Liveness never checks dependencies.
  - Readiness does.
  - New releases are gated on readiness.
- **Shutdown:** on SIGTERM:
  1. readiness answers 503
  2. in-flight requests drain
  3. the pool closes
  4. the process exits 0

  `SHUTDOWN_TIMEOUT_MS` stays inside Cloud Run's 10-second grace period.
- **Logs:** one JSON line per event to stdout, which Cloud Logging picks up. Secrets and personal data are redacted.
- **Tenancy (M2):** a `workspace_id` on every tenant-owned table, plus scoped repositories ([ADR-002](adr/002-orm-choice.md)).

## What changes later

| When | Change | Decision |
|---|---|---|
| M2 | Auth. The browser reaches the API through `web` (same origin), so session cookies stay first-party. | Auth ADR (M2) |
| M3 | Private file storage for contracts, with signed URLs. | Storage ADR (M3) |
| M4 | Redis and a BullMQ worker, for reminders and the digest. | Redis ADR (M4) |
| **Phase 1** (before real user data) | MySQL moves to **Cloud SQL 8.4 with PITR**; custom domain. | [ADR-005](adr/005-hosting-and-environments.md) |
| **Phase 2** (paying customers) | Minimum instances (no cold starts), a database standby, a load balancer. Stay on GCP or move to AWS. | New ADR |

## Decisions index

- [ADR-000](adr/000-billing-provider.md): billing provider (Stripe Billing + Stripe Tax)
- [ADR-001](adr/001-monorepo-structure.md): monorepo structure
- [ADR-002](adr/002-orm-choice.md): ORM (Drizzle + mysql2)
- [ADR-003](adr/003-repo-visibility-and-license.md): repo visibility and license
- [ADR-005](adr/005-hosting-and-environments.md): hosting and environments
