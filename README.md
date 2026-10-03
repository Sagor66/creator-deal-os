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
pnpm dev               # web on http://localhost:3000, API on http://localhost:3001
```

**Local MySQL 8.4 and Redis** (not needed until the database lands):

```sh
cp .env.example .env   # then replace the two "change-me" passwords
pnpm services:up       # starts both and waits until they're healthy
```

## Repository layout

```
apps/api            NestJS 12 (ESM): HTTP API; owns the database
apps/web            Next.js 16 App Router, Tailwind 4, shadcn/ui, TanStack Query
packages/schemas    zod contracts shared by api and web (compiled ESM package)
packages/config     shared tsconfig bases and ESLint flat configs
compose.yaml        local MySQL 8.4 and Redis
docs/               product, roadmap, ADRs
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
| `pnpm services:up` / `services:down` | Start or stop the local MySQL and Redis |

## Commits

Git hooks install themselves on `pnpm install` (Husky):
- **pre-commit:** runs ESLint (`--fix`) and Prettier on **staged files only** (lint-staged). It takes a couple of seconds.
- **commit-msg:** rejects messages that aren't [Conventional Commits](https://www.conventionalcommits.org/), e.g. `feat(api): add readiness endpoint`.

CI checks the same rules, so skipping the hooks with `--no-verify` doesn't skip the checks.

## License

[Functional Source License 1.1, Apache-2.0 future license (FSL-1.1-ALv2)](LICENSE.md):
- **You may** read, run and modify this code for any purpose **except** offering a competing commercial product or service.
- **After two years,** each version becomes available under Apache-2.0.

**Trademark:** the "Creator Deal OS" name and any logos are not licensed for your use.
