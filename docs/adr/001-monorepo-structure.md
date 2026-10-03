# ADR-001: Monorepo structure

- **Status:** Accepted
- **Date:** 2026-10-04
- **Decided by:** engineering (CLAUDE.md rule 5)
- **Related:** [`CLAUDE.md`](../../CLAUDE.md) Stack, [roadmap M1](../roadmap.md), issues #4 (scaffold), #5 (tooling), #6 (CI), #10 (first deploy), [ADR-002](002-orm-choice.md) (ORM)

## Context

Creator Deal OS has:
- **Two deployable apps:**
  - A **NestJS API** that owns the database, auth, billing webhooks and background jobs later.
  - A **Next.js web app**.
- **One contract between them.** Request and response shapes are defined as zod schemas, used to validate on the server and to build forms and parse responses in the browser.

**Constraints:**
- **Solo developer.** Every extra tool, config file or publish step is paid for in time.
- **Changes cut across both apps.** A new field on a deal touches the schema, the API and the UI. That should be **one PR, reviewed and tested together**.
- **CI must stay fast** (issue #6: under 5 minutes), so unchanged parts shouldn't be rebuilt or retested.
- **The apps deploy separately** (issue #10), so each needs a slim, self-contained build.
- **Portfolio:** the structure should be one that a reviewer recognises and finds easy to navigate.

**Facts checked 2026-10-04 that shape the details:**
- **NestJS 12** (Aug 2026) is ESM-first, and `nest new` defaults to ESM with `module: nodenext`. It compiles with `tsc`, **not a bundler**.
- **Turborepo's "Just-in-Time" internal packages** only work when the consumer transpiles them. That fits Next.js, but not a `tsc`-compiled NestJS app. **"Compiled" packages** (built with `tsc` to `dist`) work for both, and Turborepo caches them [docs](https://turborepo.dev/docs/core-concepts/internal-packages).
- **TypeScript 7** (Jul 2026, Go-native) has **no stable programmatic API until 7.1**, so the NestJS CLI and typescript-eslint still need TypeScript 6 [docs](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/).
- **pnpm 11** (Apr 2026):
  - Requires Node 22+.
  - Blocks dependency install scripts unless listed in `allowBuilds`.
  - Moves settings into `pnpm-workspace.yaml`.
  - **pnpm 12** (Aug 2026) is a Rust rewrite [docs](https://pnpm.io/blog/releases/11.0).
- **Node:** 22 and 24 are LTS; 26 is Current [docs](https://nodejs.org/en/about/previous-releases).

## Options

### Repo shape
| Option | For | Against |
|---|---|---|
| **Monorepo** | Atomic cross-app changes, one CI, shared tooling and types without publishing | Needs a workspace tool and some discipline about boundaries |
| Polyrepo (api, web, shared package published to a registry) | Hard isolation | Every schema change means publish → bump → install in two repos, and nothing changes atomically. Pure friction for one person. |

### Workspace and task tooling
| Option | For | Against |
|---|---|---|
| **pnpm workspaces + Turborepo** | pnpm's strict `node_modules` blocks phantom dependencies; catalogs share versions; Turborepo adds a cached task graph, `--affected` and `turbo prune --docker` with little config | Turborepo's boundaries check is still experimental |
| Nx | Generators, a project graph, mature module-boundary lint rules | Many more concepts and plugin coupling. Its own guidance targets bigger teams; overkill for 2 apps and 2 packages. |
| npm or Yarn workspaces, no task runner | Simplest | No caching or affected-only runs, so CI grows with the repo |
| Bun workspaces | Fast installs | Different runtime from production Node; less proven with NestJS |

### How shared packages are consumed
| Option | For | Against |
|---|---|---|
| Just-in-Time (export TS source) | No build step | **Doesn't work for a `tsc`-compiled NestJS app**; nothing for Turborepo to cache |
| **Compiled** (`tsc` → `dist`, ESM, `.d.ts` + declaration maps) | Works for Nest (Node), Next (Turbopack) and tests alike; build is cached; go-to-definition still lands in source via declaration maps | A watch build in dev (`tsc -w`) |
| Publishable to npm | — | No one outside this repo consumes them |

## Decision

### 1. One pnpm + Turborepo monorepo with this layout

```
apps/
  api/           NestJS (ESM). Owns the DB: schema, migrations, repositories (ADR-002).
                 A future BullMQ worker is a second entrypoint of this app, not a new app.
  web/           Next.js App Router, Tailwind, shadcn/ui (components live here), TanStack Query.
packages/
  schemas/       zod contracts shared by api and web. Compiled ESM package.
  config/        shared tsconfig bases + ESLint flat config. Plain files, no build.
docs/            product, roadmap, ADRs, design notes, runbooks, devlog
```

**Packages we deliberately don't create yet:**

| Package | Why not now | Add when |
|---|---|---|
| `packages/db` | The API is the only database user | A second app needs DB access |
| `packages/ui` | There's one web app, and shadcn/ui copies components into the app by design | A second frontend appears |
| `apps/worker` | The worker can be a second entrypoint of the API | Jobs need separate scaling or dependencies |

### 2. Dependency rules
- **Apps never depend on each other.** The web app talks to the API over HTTP and only shares `packages/schemas`.
- **Packages never depend on apps.**
- **Enforced three ways:**
  1. **pnpm's strict install** stops undeclared imports.
  2. **An ESLint rule in `packages/config`** (`no-restricted-imports` or eslint-plugin-boundaries) catches relative escapes like `../../api/src`.
  3. **`turbo boundaries` in CI**, advisory only while it's experimental.
- **Internal dependencies** use `workspace:*`.

### 3. Shared packages are compiled
- `packages/schemas` builds with `tsc`: `module: nodenext`, ESM, `declaration` + `declarationMap`.
- It exports `{ ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } }`.
- **No top-level await,** so a CommonJS consumer could still `require()` it.
- Next.js (Turbopack) uses it without `transpilePackages`.

### 4. One contract, validated on both sides
- **API:** NestJS 12's built-in Standard Schema validation (`StandardSchemaValidationPipe`) validates requests with the zod schemas. No third-party adapter: `nestjs-zod` doesn't support Nest 12 yet.
- **Web:** uses the same schemas for forms and to parse API responses.
- **No code generation** (OpenAPI clients, tRPC) for now. `z.toJSONSchema` can produce OpenAPI later if a public API is ever needed.

### 5. Toolchain pins (as of 2026-10-04)

| Tool | Pin | Reason |
|---|---|---|
| Node | **24 LTS** (`.nvmrc` + `engines`) | Move to 26 once it enters LTS |
| pnpm | **11** via `devEngines.packageManager` | The conservative choice. Move to 12 once `turbo prune` and CI are proven on it. |
| TypeScript | **6.0.x**, repo-wide, via a pnpm **catalog** | The NestJS CLI and typescript-eslint need it. Move to 7 when 7.1 ships a stable API and the tooling supports it. |
| Shared libraries (zod, eslint, vitest) | pnpm catalogs | One version across workspaces |

### 6. Task graph (`turbo.json`)
- **Tasks:** `build` depends on `^build` (packages build before the apps that use them). `dev` is persistent and uncached, with `schemas` running `tsc -w`. Also `lint`, `typecheck` and `test`.
- **Outputs:** `dist/**`, `.next/**`, `!.next/cache/**`.
- **Environment variables:** Turborepo's strict env mode is the default, so **every env var a task reads is declared** in `turbo.json`. This is the same list as the zod env schemas (#7). Undeclared vars are filtered out, and caching would otherwise be wrong.
- **CI** runs `turbo run lint typecheck test build --affected`.

### 7. Deploying one app at a time
- **Each app gets a slim image:** `turbo prune <app> --docker` builds an image with only that app, its workspace dependencies and a pruned lockfile.
- **Fallback:** `pnpm --filter <app> --prod deploy`.

## Consequences

**Positive:**
- **Atomic changes.** A field added to a deal touches `schemas`, `api` and `web` in one PR with one CI run.
- **Shared types.** The browser and the API can't disagree about a contract without a type error.
- **Fast, incremental CI.** Unchanged packages hit the cache, and `--affected` skips untouched apps.
- **Slim, independent deploy images.**
- **Easy to navigate** for anyone who knows Turborepo.

**Negative, and accepted:**
- **A build step for `schemas` in dev.** `tsc -w` runs alongside the apps. A schema edit takes a moment to reach the app.
- **pnpm strictness surfaces hidden problems early.** Undeclared imports fail. Packages with install scripts (e.g. `@swc/core`, `esbuild`) must be listed in `allowBuilds`, or install fails under pnpm 11's `strictDepBuilds`.
- **ESM-first NestJS** may hit libraries not yet ready for Nest 12 or ESM; `nestjs-zod` is already one. Prefer built-in Nest features, and note the exceptions in PRs.
- **Every env var has to be listed twice:** in the zod schema and in `turbo.json`. A CI check can compare them later if they drift.
- **Pinning TypeScript 6 while 7 exists** means we skip TS 7's speed for now.
- **`turbo boundaries` is experimental,** so the ESLint rule is what actually enforces boundaries until it's stable.

## When we'd revisit
- **Team or app count grows** (3+ apps or 3+ developers): re-evaluate Nx for stronger module boundaries and generators.
- **A second app needs the database:** extract `packages/db`.
- **Jobs need separate scaling or dependencies:** split the worker into `apps/worker`.
- **TypeScript 7.1** ships a stable API and the NestJS CLI and typescript-eslint support it: upgrade the catalog pin.
- **pnpm 12 and Node 26 LTS:** upgrade once CI and `turbo prune` pass on them.
- **The build step for `schemas` becomes painful** (e.g. slow feedback): reconsider Just-in-Time packages if NestJS moves to a bundler-based build.
