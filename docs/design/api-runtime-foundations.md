# Design note: API runtime foundations (config, health, shutdown, logging)

- **Date:** 2026-10-04
- **Issues:** #7 (env validation), #8 (health + graceful shutdown), #9 (structured logging)
- **Builds on:** ADR-001 (structure), ADR-002 (MySQL via mysql2/Drizzle, UTC)
- **Status:** implemented in the PR that adds this note

## Why these four together

They're the plumbing every later feature runs on, and they depend on each other:
- **Logging** needs the validated log level.
- **Readiness** needs the MySQL pool, which needs `DATABASE_URL`.
- **Shutdown** has to flip readiness, drain HTTP, close the pool, and log each step.

Built separately, each would stub the others.

## 1. Config: one validated env module per app

`apps/api/src/config/env.ts` holds a zod schema, `loadEnv(source = process.env)` and a DI token `ENV`.

| Variable | Required | Default | Rule |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development` \| `test` \| `production` |
| `PORT` | no | `3001` | integer 1–65535 |
| `APP_VERSION` | no | `dev` | non-empty; deploys set the git SHA |
| `DATABASE_URL` | **yes** | — | URL, `mysql:` protocol, with a database name |
| `LOG_LEVEL` | no | per env: `debug` (dev), `silent` (test), `info` (prod) | pino level name |
| `LOG_FORMAT` | no | `pretty` in development, else `json` | `json` \| `pretty` |
| `TRUST_PROXY` | no | `false` | strict boolean string (`true`/`false`/`1`/`0`) |
| `SHUTDOWN_TIMEOUT_MS` | no | `10000` | integer 1000–60000 |

**Rules**
- **Fail fast, say everything, leak nothing.** A failed parse throws `EnvValidationError`, listing **every** bad key and the reason (`DATABASE_URL: required`, `PORT: expected an integer`). The message never contains the values, since a malformed `DATABASE_URL` may hold a password. `main.ts` prints the message and exits `1` before Nest starts.
- **Only the env module reads `process.env`.** ESLint's `no-restricted-properties` bans `process.env` everywhere except the env modules, config files and tests. Everything else gets typed config through `ENV`.
- **Booleans are parsed strictly.** `z.coerce.boolean()` turns `"false"` into `true`, so we use `z.stringbool()`.
- **Loading the file:**
  - Local dev reads the root `.env` through Node's built-in `--env-file` (passed by `nest start --env-file ../../.env`).
  - Production gets real environment variables from the platform. No dotenv library is involved.
- **The web app gets the same treatment, smaller:**
  - `src/env.schema.ts` holds the pure, testable schema.
  - `src/env.ts` starts with `import "server-only"`, so the build fails if a client component ever imports it.

## 2. Health endpoints

**`GET /health`, liveness:** `200 {"status":"ok"}`.
- No dependency checks, ever. A database outage must not make the platform restart healthy processes.
- It stays `200` during shutdown, because the process is alive.

**`GET /health/ready`, readiness:** "should this instance receive traffic?"

| State | Code | Body |
|---|---|---|
| All checks pass | `200` | `{"status":"ready","checks":{"mysql":{"status":"up","durationMs":3}}}` |
| A check fails or times out | `503` | `{"status":"not_ready","checks":{"mysql":{"status":"down","durationMs":500,"error":"timeout"}}}` |
| Shutting down | `503` | `{"status":"shutting_down","checks":{}}` |

**How the checks work**
- Each check implements a small `HealthIndicator` interface and is registered in one provider list. Redis plugs in later without touching the controller.
- Checks run **in parallel**, each with a **500 ms** cap (`Promise.race`), so the response always arrives in under 1 s. The cap matters because mysql2's own `connectTimeout` doesn't cover waiting for a free pooled connection.
- The MySQL check is `SELECT 1` through the shared pool.

**What's safe to show and log**
- **The body is public, so `error` is a short code** (`timeout`, `ECONNREFUSED`, `ER_ACCESS_DENIED_ERROR`), never a message that could include hosts or credentials. The full error is logged server-side at `warn`.
- **No caching:** `Cache-Control: no-store`.
- **Health requests log at `debug`,** not `info`, so platform probes every few seconds don't flood the logs.

**The MySQL pool**
- `DatabaseModule` creates a mysql2 pool from `DATABASE_URL`: `connectionLimit: 10`, `connectTimeout: 2000`, `enableKeepAlive`, `timezone: 'Z'` (ADR-002).
- **The pool connects lazily,** so the API starts even when MySQL is down. Liveness says up, readiness says not ready, which is exactly the right signal.
- **Drizzle wraps this same pool** when the database issue lands.

## 3. Graceful shutdown

**What Nest does, verified in `@nestjs/core` 12.1.2 source** (`runShutdownSequence`):

```
signal (SIGTERM/SIGINT)
 └─ prepareClose        express adapter marks itself as shutting down
 └─ onModuleDestroy
 └─ beforeApplicationShutdown(signal)   ← ShutdownService: readiness → 503, start the force-exit timer, log "shutdown started"
 └─ dispose()           httpServer.close(): stop accepting connections, wait for in-flight requests
 └─ onApplicationShutdown(signal)       ← DatabaseModule: pool.end();  ShutdownService: log "shutdown complete"
 └─ process.exit(0)     because we pass { useProcessExit: true }
```

**Decisions**
- **`app.enableShutdownHooks(["SIGTERM", "SIGINT"], { useProcessExit: true })`.**
  - Without `useProcessExit`, Nest re-sends the signal to itself and the process exits 143 (killed by SIGTERM).
  - With it, a clean shutdown exits **0**, and Node's `exit` handlers run.
- **The pool closes in `onApplicationShutdown`.** It runs *after* the HTTP server has drained, so an in-flight request never loses its database halfway through.
- **In-flight requests finish.** `server.close()` refuses new connections, and Node 24 drops idle keep-alive sockets. While shutting down, our middleware sets `Connection: close` on responses, so busy keep-alive sockets close after their current response.
- **Never `forceCloseConnections`.** In Nest's Express adapter it destroys every socket immediately, *including in-flight requests*.
- **A timeout guarantees exit.**
  - On `beforeApplicationShutdown` we start a `SHUTDOWN_TIMEOUT_MS` timer (unref'd).
  - Each closable resource (`http-server`, `mysql-pool`) is registered with the `ShutdownService` and marked closed when it finishes.
  - If the timer fires, we log `fatal` "shutdown timed out" with the **names of the resources still open**, and exit **1**.
  - The exit function is injectable, so tests check this without killing the test runner.
- **A second signal during shutdown is ignored** (Nest's own guard). The timeout is the backstop.

**Not now:** a drain delay before closing (sleep after readiness flips, so load balancers deregister the instance). Whether it's needed depends on the host chosen in #10; the readiness flip is already in place.

## 4. Structured logging

**One pino logger for the whole process**
- **Created in `main.ts` before Nest,** so even a boot failure is logged as JSON.
- **Nest uses it** through a small `LoggerService` adapter (`app.useLogger`, with `bufferLogs: true`). Framework logs (route mapping, unhandled exceptions) come out in the same format.

**Format**
- **Production (`json`):** one JSON line per event, written synchronously to stdout. Nothing is lost when the process exits.
- **Development (`pretty`):** pino-pretty as a transport (a dev dependency only).

**Fields on every line**
- `time` (ISO-8601), `level` (as a label), `msg`, `service`, `version`, `pid`, `hostname`
- **Inside a request,** `requestId` too, through pino's `mixin` reading the request context. Code never passes IDs around.

**Request context (AsyncLocalStorage)**
- `RequestContextMiddleware` runs first on every request:
  1. **Takes the incoming `X-Request-Id`** if it matches `^[A-Za-z0-9._-]{8,128}$`; otherwise generates `randomUUID()`. The pattern blocks log injection through crafted headers.
  2. **Sets `X-Request-Id`** on the response.
  3. **Runs the rest of the request** inside `requestContext.run({ requestId }, next)`.
  4. **On `finish`, logs one access line:** `msg: "request completed"`, `method`, `route` (the route *template*, e.g. `/health/ready`, never the raw URL or query string), `status`, `durationMs`. The level is `debug` for `/health*`, `error` for 5xx, and `info` otherwise.
- **Later fields:** `workspaceId` and `userId` join the context in M2. The mixin picks them up with no other changes.

**Redaction, from pino's `redact` (censor `[REDACTED]`)**
- **Headers:** `authorization`, `cookie`, `set-cookie`, `x-api-key`.
- **Secrets:** `password`, `token`, `accessToken`, `refreshToken`, `secret`, `apiKey`, `DATABASE_URL`, at the top level and one or two levels deep.
- **Personal data:** `email` and `phone` at the same depths.
- **The rule that redaction can't enforce:** log IDs, never personal data or bodies. Redaction is the safety net, not the plan.

**Errors**
- **Unexpected errors inside a request** are logged once by Nest's exception handler through our adapter: stack trace, plus `requestId` from the context.
- **`unhandledRejection`** is logged at `error`.
- **`uncaughtException`** is logged at `fatal`, then the process exits `1`.

**Levels by environment:** `debug` (development), `silent` (test, where tests that assert on logs build their own logger), `info` (production). `LOG_LEVEL` overrides.

**Tracing from the web app:** the home page forwards the incoming `X-Request-Id` (or a fresh UUID) when it calls the API, so one page view can be followed into the API's logs.

## 5. Tests

| What | How |
|---|---|
| Env schema | Unit: valid; missing `DATABASE_URL`; `PORT=abc`; wrong protocol; defaults per `NODE_ENV`; `TRUST_PROXY=false` → `false`; the error lists every bad key and never contains the input values |
| `/health`, `/health/ready` | e2e (supertest) with a **fake pool**: up → 200; error → 503 with a code; hanging → 503 `timeout` in under 1 s; shutting down → 503 |
| Request ID | e2e: generated when missing; echoed when valid; replaced when malformed; present on the access-log line |
| Redaction | Unit: a logger writing to an in-memory stream; sensitive keys come out `[REDACTED]`, the values never appear |
| Graceful shutdown | Integration, in-process: a slow test route is in flight → `app.close()` → the request still completes `200`, readiness is `shutting_down`, `pool.end()` runs, and new connections are refused. Timeout path: a hung request plus a short timeout calls the injected exit with `1` and logs the pending resource names. |
| Real MySQL and a real SIGTERM | **Manual for now,** against the local compose MySQL, recorded in the PR. Automated Testcontainers coverage arrives with the database issue. |

## Rejected alternatives

| Alternative | Why not |
|---|---|
| `@nestjs/terminus` | Its value is ready-made indicators for TypeORM, Prisma and the like. There's none for mysql2 or Drizzle, and a 30-line indicator gives full control of the public response shape. |
| `nestjs-pino` (+ pino-http) | It supports Nest 12, but keeps its request context internal. We need the request context for more than logging (forwarding IDs now; workspace and user later). The latest release was also too new for pnpm's 24-hour rule. Owning ~100 lines is the clearer trade. |
| Checking MySQL in liveness | A database blip would make the platform restart every instance and turn an outage into a crash loop |
| `forceCloseConnections: true` | It destroys in-flight requests on shutdown |
| A dotenv library | Node 24 loads `.env` files natively |
| Logging `req.url` | It contains IDs and query strings that may hold tokens or personal data. The route template carries the same signal. |
| Readiness errors as full messages | The endpoint is public; messages can leak hosts and users |

## Follow-ups (not in this PR)

1. **Testcontainers coverage of the MySQL indicator:** database issue.
2. **A drain delay before closing, if the host needs it:** #10.
3. **Error tracking** (Sentry or similar) on top of these logs: M5.
4. **`workspaceId` and `userId` in the request context:** M2.
