# ADR-002: ORM and database access

- **Status:** Accepted
- **Date:** 2026-10-04
- **Decided by:** engineering (CLAUDE.md rule 5). This confirms "ORM is Drizzle" in `CLAUDE.md` Product principles, with the comparison behind it.
- **Related:** [ADR-001](001-monorepo-structure.md) (the API owns the DB), [roadmap M1–M4](../roadmap.md), issue #4 (scaffold), M2 tenant-isolation suite, M4 invoice numbering

## Context

The API stores everything in **MySQL 8 (InnoDB)**. It's a multi-tenant system with **one shared schema and a `workspace_id` on every tenant-owned table**.

**What the data layer has to handle:**
1. **Migrations:** reviewable, repeatable, run in CI and in Testcontainers tests against real MySQL (CLAUDE.md rule 6).
2. **Row locking:** M4 needs concurrency-safe operations:
   - **Sequential invoice numbers per workspace**, with no gaps or duplicates under concurrent requests.
   - **Invoice balances** updated by partial payments.
   - **Idempotent Stripe webhook processing.**

   These need `SELECT … FOR UPDATE` (and sometimes `SKIP LOCKED` / `NOWAIT`) or atomic single-statement updates.
3. **Raw SQL escape hatches** for MySQL-specific features (`ON DUPLICATE KEY UPDATE`, `LAST_INSERT_ID(expr)`, JSON functions), with values always parameterised.
4. **Tenant scoping:** MySQL has **no row-level security**, so the application must guarantee that no query reads or writes another workspace's rows. M2's exit check is a test suite that proves it.
5. **Long-term maintenance:** a solo developer can't absorb an ORM that breaks often, abandons MySQL, or hides SQL behind behaviour that's hard to debug.

**Facts checked 2026-10-04:**

| Fact | Detail |
|---|---|
| **Prisma 7** (Nov 2025) | Replaced its Rust engine with a TypeScript query compiler; `prisma.config.ts` and driver adapters are now mandatory |
| **Prisma 8** (release candidate) | **Doesn't support MySQL yet** ("MySQL is planned next"). MySQL users stay on 7.x, which gets fixes for 18 months after 8 ships |
| `npm i -D prisma` | Currently installs the **8.0 release candidate**. The `prisma` CLI's `latest` tag points at it, while `@prisma/client`'s points at 7.10.0 |
| Prisma row locking | **No `FOR UPDATE` in its query API**: open requests #8580 (2021), #17136, #5983, and #30531 for Prisma 8 |
| Prisma open bug #29762 | Critical, no maintainer reply: on MySQL 8 with 7.8–7.10, **a transaction that times out can partially commit** |
| **Drizzle** stable vs 1.0 | 0.45.x is stable and rarely patched. **1.0 is a release candidate** (rc.4, Jun 2026) that changes the migrations folder layout and replaces relational queries v1 |
| Drizzle backing | The core team has been employed by **PlanetScale** since Mar 2026 (a MySQL and Postgres company); the project stays independent open source |
| Drizzle row locking | `.for('update' \| 'share', { noWait \| skipLocked })` on the select builder |
| **Kysely** 0.29 | ESM-only, Node 22+; two volunteer maintainers; breaking changes ship in minor versions |

## Options

| Criterion | **Prisma 7** | **Drizzle** | **Kysely** | Raw `mysql2` |
|---|---|---|---|---|
| Row locking (`FOR UPDATE`, `SKIP LOCKED`, `NOWAIT`) | ❌ Raw SQL only | ✅ Native on the select builder (not on the relational `db.query` API) | ✅ `forUpdate()`, `skipLocked()`, `noWait()` | ✅ It's SQL |
| Raw SQL escape hatch | `$queryRaw` (parameterised); TypedSQL still in preview and needs a live DB during `generate` | `sql` template, mixes into builder queries; `db.execute` | `sql` template | Everything is raw |
| Migrations | SQL files from schema diff. Needs a **shadow database** (CREATE privileges) in dev. **No programmatic API**, so tests shell out to the CLI | SQL files from schema diff (drizzle-kit), committed and reviewable; `migrate()` callable from tests. Rename detection **prompts** | Hand-written TypeScript up/down migrations; `Migrator` in code | DIY |
| Inserted IDs (MySQL has no `RETURNING`) | `create` returns the row | `$returningId()`, but only with a **column-level** primary key | `insertId` | `insertId` |
| Upsert | **Emulated** on MySQL (can race) | Native `onDuplicateKeyUpdate` | Native `onDuplicateKeyUpdate` | Native |
| Tenant scoping on MySQL | `$extends` query hook injects `workspaceId`, but **top-level operations only**: nested queries aren't intercepted, and raw SQL bypasses it | No hook; explicit scoped repositories | No hook; wrapper or query-rewriting plugin | Explicit |
| Composite foreign keys `(workspace_id, id)` | ✅ | ✅ | ✅ (in migrations) | ✅ |
| Types | Generated client (a codegen step) | Schema written in TypeScript, types inferred, no codegen | Generated from the DB (`kysely-codegen`) or hand-written | None |
| Long-term risk on **MySQL** | **High:** the next major has no MySQL, there's an open partial-commit bug, and locking has been missing for 5 years | **Medium:** pre-1.0 churn and a sparsely patched stable line, but a funded team at a MySQL company | **Medium:** small volunteer team, minor-version breaks; but a thin layer that's easy to leave | Low dependency risk, high build-it-yourself cost |

## Decision

**Use Drizzle ORM with `mysql2`, with SQL migrations generated by drizzle-kit, inside `apps/api`.**

### Why Drizzle
1. **Locking and MySQL features are first-class.** `.for('update')`, `onDuplicateKeyUpdate` and `sql` fragments sit inside typed queries. The M4 invoice counter and balance updates need no raw strings outside the builder.
2. **The SQL stays visible.** The core builder reads like the SQL it emits, so `EXPLAIN`, debugging and code review are straightforward. That matters more than abstraction for a solo developer and for senior interviews.
3. **Migrations are plain, reviewed SQL.** drizzle-kit writes a SQL file from the TypeScript schema; we read it in the PR, commit it, and run it with `migrate()` in tests and in deploys. There's no shadow database and no CLI shell-out in tests.
4. **Prisma is ruled out on MySQL specifically.** No `FOR UPDATE`, the next major doesn't support MySQL, and an open bug can partially commit a timed-out transaction. That last one goes straight to invoice balances.
5. **Over Kysely,** Drizzle offers a schema written in code that migrations are generated from, plus funded maintenance. Kysely would mean hand-writing every migration and types generated from the DB.

### How we use it (rules that fall out of this ADR)

**Versions**
- **Start on the stable 0.45.x line, pinned exactly.** Use only the core SQL-like builder, **not** the relational `db.query` API. That makes the later 1.0 upgrade a migrations-folder conversion (`drizzle-kit up`), not a rewrite of query code.
- Upgrade when 1.0 is final.

**Tenant scoping, enforced in four layers, none of them relying on the ORM**
1. **Scoped repositories.** Request handlers never touch the raw `db`. A repository is created per request with a `WorkspaceContext` and adds `eq(table.workspaceId, ctx.workspaceId)` to every query, through one shared helper. An ESLint rule forbids importing the raw `db` outside the data module.
2. **The database refuses cross-tenant references.** Every tenant table has `workspace_id NOT NULL`, a **column-level** `id` primary key (which keeps `$returningId()` working), and `UNIQUE (workspace_id, id)`. Child tables reference parents through **composite foreign keys** `(workspace_id, parent_id) → (workspace_id, id)`, so a deal can never point at another workspace's brand.
3. **Indexes lead with `workspace_id`.**
4. **The M2 tenant-isolation suite** hits every endpoint with a second workspace's IDs.

**Locking and concurrency (M4 design note decides the details)**
- **Invoice numbers:** either a per-workspace counter row locked with `SELECT … FOR UPDATE` in a transaction, or the single-statement `INSERT … ON DUPLICATE KEY UPDATE n = LAST_INSERT_ID(n + 1)`.
- **Balance updates:** lock the invoice row inside the transaction.
- **Webhook idempotency:** a unique constraint on the provider's event ID.

**Migrations**
- **Generate locally,** read the SQL in the PR and commit it. CI and tests only ever *apply* migrations, never generate them, so drizzle-kit's interactive rename prompt can't hang CI.
- **Never use `drizzle-kit push`** outside a throwaway local database.
- **Keep migrations small.** MySQL commits DDL implicitly, so a failed multi-statement migration is left half-applied.
- **Schema changes on live tables use expand/contract:** add the new column, backfill, switch, then drop the old one.
- **Deploys run migrations as a release step,** before the new version takes traffic, not on every app boot.

**Raw SQL**
- Only through the parameterised `sql` template.
- `sql.raw` is allowed only for reviewed constants (e.g. a column name from an allow-list) and is flagged in review.

**Time**
- Store and compare in UTC: the connection time zone is set to UTC, and the API's DTOs carry ISO-8601 strings.

## Consequences

**Positive:**
- **No raw SQL strings for locking, upserts or counters.** All of it is typed and composable.
- **Migrations are reviewable SQL** and run identically in tests (Testcontainers), CI and production.
- **No codegen or engine binary.** The schema is TypeScript in `apps/api`, which fits the ESM, `tsc`-built NestJS app in ADR-001.
- **Tenant safety doesn't depend on ORM magic.** A Prisma-style auto-filter that silently skips nested and raw queries would be *more* dangerous than an explicit, tested repository layer.

**Negative, and accepted:**
- **We build tenant scoping ourselves.** That means discipline plus the four layers above. Forgetting the filter in a new repository method is caught by the isolation suite, not by the compiler.
- **Pre-1.0 churn.** 0.45 gets few patches, and the 1.0 upgrade changes the migrations layout. Mitigated by pinning exact versions and avoiding the relational query API.
- **drizzle-kit quirks:**
  - Renames prompt interactively (#5307), and the 1.0 release candidate wants `--hints` for them (#6025).
  - `$returningId()` ignores table-level primary keys (#4302) and returns wrong IDs combined with `onDuplicateKeyUpdate` (#3912). Avoid that combination.
  - Multi-row ID lists assume consecutive auto-increment values, which MySQL only guarantees for simple inserts.
- **Composite foreign keys need care:** `ON DELETE SET NULL` would also null `workspace_id`. Use `RESTRICT` or `CASCADE` only, and choose deliberately per relation.
- **Hiring signal:** Prisma is likely more common in job adverts. Accepted, because working closer to SQL (locking, isolation levels, expand/contract) is the stronger senior-level story.

## When we'd revisit
- **Drizzle stalls** (no 1.0 final, or no patches for months) or drops MySQL priority: move to **Kysely**.
  - The committed SQL migrations stay valid; any runner can apply them.
  - Core-builder queries translate almost line for line.
  - The tenant scoping lives in our repositories, not the ORM, so it moves with us.
- **Prisma 8 ships MySQL** with native row locking and the partial-commit class of bug fixed, *and* we hit a real productivity wall with Drizzle: re-evaluate. Unlikely to be worth a migration.
- **The relational query API becomes necessary** for complex nested reads: adopt it only after the 1.0 upgrade, using the new `defineRelations` API.
- **We move to Postgres** (no plan to): row-level security becomes possible, and the tenant-scoping design should be revisited.
