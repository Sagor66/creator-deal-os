# Creator Deal OS

A multi-tenant SaaS for content creators to run brand deals end to end: deal pipeline, deliverables, usage rights, invoicing and payment chasing.

**Status:** M1 Foundation. The monorepo scaffold is in place; no product features yet.

## Read the planning trail
- [Product brief](docs/product/brief.md): problem, target users, MVP, risks, assumptions to validate
- [Research](docs/product/research.md): the evidence, with sources
- [Roadmap](docs/roadmap.md): milestones M1–M5
- [Architecture decisions](docs/adr/): billing provider, monorepo structure, ORM, license

## Getting started

**Requirements:**
- **Node 24.** `.nvmrc` pins it; run `fnm use` or `nvm use`.
- **Corepack,** which ships with Node 24. It runs the exact pnpm version pinned in `package.json`.
- **Docker,** only for the local MySQL and Redis.

```sh
corepack enable        # once per machine: use the repo's pinned pnpm (11.x)
pnpm install
cp .env.example .env   # set MYSQL_PASSWORD and MYSQL_ROOT_PASSWORD; put the same password in DATABASE_URL
pnpm services:up       # MySQL 8.4 + Redis, waits until healthy
pnpm dev               # web on http://localhost:3000, API on http://localhost:3001
```

**Health:**
- **Liveness:** `GET http://localhost:3001/health`.
- **Readiness:** `GET http://localhost:3001/health/ready`. It returns 503 until MySQL answers.
- **If the API exits at startup with "Invalid environment configuration",** read the list: it names every missing or invalid variable.

## Repository layout

```
apps/api            NestJS 12 (ESM): HTTP API; owns the database
apps/web            Next.js 16 App Router, Tailwind 4, shadcn/ui, TanStack Query
packages/schemas    zod contracts shared by api and web (compiled ESM package)
packages/config     shared tsconfig bases and ESLint flat configs
compose.yaml        local MySQL 8.4 and Redis
infra/              Cloud Run manifests, deploy script, one-time GCP setup
scripts/            smoke test used after every deploy
docs/               product, roadmap, ADRs, design notes, runbooks
```

The structure and its rules are explained in [ADR-001](docs/adr/001-monorepo-structure.md).

## Scripts

Run these from the repo root. Turborepo runs each task in every workspace and caches the results.

| Command | What it does |
|---|---|
| `pnpm dev` | Watch mode for all apps and packages |
| `pnpm build` | Production builds |
| `pnpm lint` | ESLint with type-aware rules, zero warnings allowed |
| `pnpm typecheck` | TypeScript with every strict flag |
| `pnpm test` | Vitest unit and end-to-end tests |
| `pnpm format` / `format:check` | Prettier: rewrite, or only verify (Markdown is formatted by hand) |
| `pnpm check:boundaries` | Fails if a workspace imports another's files by relative path, or uses a package it doesn't declare |
| `pnpm services:up` / `services:down` | Start or stop the local MySQL and Redis |
| `pnpm --filter @cdo/api db:migrate` | Apply pending migrations to the database in `.env` (build the API first) |

## Commits

Git hooks install themselves on `pnpm install` (Husky):
- **pre-commit:** runs ESLint (`--fix`) and Prettier on **staged files only** (lint-staged). It takes a couple of seconds.
- **commit-msg:** rejects messages that aren't [Conventional Commits](https://www.conventionalcommits.org/), e.g. `feat(api): add readiness endpoint`.

CI checks the same rules, so skipping the hooks with `--no-verify` doesn't skip the checks.

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every pull request, on pushes to `main`, and weekly.

| Job | What it checks |
|---|---|
| `checks` | Conventional Commits (every commit + PR title), Prettier, workspace boundaries, then `turbo run lint typecheck test build` with the Turborepo cache restored |
| `dependency-review` | Fails a PR that adds or upgrades to a dependency with a known vulnerability (moderate or worse) |
| `audit` | `pnpm audit --prod`: no high or critical advisories in anything that ships |
| `secret-scan` | gitleaks over the PR's commits (all history on `main` and weekly) |
| `images` | Builds both Docker images, then runs them against MySQL 8.4: the migrate job, the api, the web app, and the deploy smoke test |

GitHub's own secret scanning, push protection and Dependabot alerts are also on. Dependabot opens weekly update PRs for npm packages, GitHub Actions and the Docker base images.

## Deploy

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): a merge to `main` that passes CI deploys to **staging** automatically. **Production** waits for a manual approval, then runs the same image digests. Both run on Google Cloud Run, with MySQL on Aiven, in the EU.
- **Why this hosting:** [ADR-005](docs/adr/005-hosting-and-environments.md).
- **How the pipeline works:** [design note](docs/design/deployment.md).
- **First-time setup, rollback, secrets:** [runbook](docs/runbooks/deploy-and-rollback.md).

```sh
pnpm --filter @cdo/api build && pnpm --filter @cdo/api db:migrate   # apply migrations to the local database
docker build -f apps/api/Dockerfile -t cdo-api .                     # build an image from the repo root
```

## License

[Functional Source License 1.1, Apache-2.0 future license (FSL-1.1-ALv2)](LICENSE.md):
- **You may** read, run and modify this code for any purpose **except** offering a competing commercial product or service.
- **After two years,** each version becomes available under Apache-2.0.

**Trademark:** the "Creator Deal OS" name and any logos are not licensed for your use.
