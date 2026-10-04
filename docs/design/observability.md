# Design note: observability (errors, uptime, backups)

- **Date:** 2026-10-04
- **Issue:** #24
- **Builds on:**
  - [ADR-005](../adr/005-hosting-and-environments.md): Phase 0, $0
  - [deployment](deployment.md): build once, promote by digest
  - [api runtime foundations](api-runtime-foundations.md): logs, health
- **Decision record:** [ADR-006](../adr/006-error-tracking-and-uptime.md)
- **Status:** implemented in the PR that adds this note

## Three signals, three questions

| Signal | Answers | Tool | Who looks |
|---|---|---|---|
| **Logs** | "What happened, in order, for this request?" | Cloud Logging (JSON lines we already write) | A human, while debugging |
| **Errors** | "What broke, how often, since which release, with which stack?" | Sentry | An alert brings a human |
| **Uptime** | "Is it reachable from outside, right now?" | Better Stack | An alert brings a human |

**Errors and uptime fail differently:**
- A crash in a background request shows up in errors but not uptime.
- A DNS or TLS failure, or a database that's powered off, shows up in uptime and may produce no error at all.

**Logs stay the source of truth for detail.** Sentry events carry the request ID, so you can jump from an issue to its log lines.

## 1. Sentry configuration (both apps)

- **One organization, in the EU data region** (`de.sentry.io`), chosen at creation and permanent. Error data stays in the EU, consistent with ADR-005.
- **Two projects, `cdo-api` and `cdo-web`.** One image serves both environments, so **environment and release are runtime config**, never baked into the image:

| Variable | Where it comes from | Meaning |
|---|---|---|
| `SENTRY_DSN` | GitHub environment variable → Cloud Run env | Where events go. **Not a secret:** browsers have to receive it anyway. Unset means Sentry is off (local dev, tests). |
| `SENTRY_ENVIRONMENT` | `deploy.sh` (`staging` or `production`) | Required whenever a DSN is set, so no event is ever mislabelled |
| `APP_VERSION` | the deploy (the 12-character commit) | Used as the Sentry **release** |

- **What's captured:** errors only.
  - **No tracing:** `tracesSampleRate` is left unset, which saves quota and keeps request data out.
  - **No session replay,** for privacy.
  - **No local variables.**

## 2. API (`@sentry/node`)

- **`initSentry(env)`** runs in `main.ts` before Nest is created, and in the `migrate` job. It removes these default integrations:
  - `OnUncaughtException` and `OnUnhandledRejection`: our own handlers capture, **flush**, then exit, so there's no duplicate and no lost event.
  - `ProcessSession`: a whole-process session means nothing for a server.
- **`ErrorReportingFilter`** is the global exception filter:
  - **Reports only unexpected failures:** anything that isn't an `HttpException`, or a 5xx. A 4xx is the client's mistake and control flow, not an alert.
  - **Attaches explicit request context:** method, route template, path **without the query string**, and the request ID.
  - **Awaits `Sentry.flush(2000)` before responding.** Cloud Run throttles CPU once the response is sent (request-based billing), so a background send could stall until the next request, or never happen. Errors are rare, so adding at most 2 s to an error response is the right trade.
- **`migrate` reports its own failure** before exiting 1. A failed migration is exactly the event you want an email about.

## 3. Web (`@sentry/nextjs`)

- **Server:**
  - `src/sentry.server.config.ts` initialises from runtime env.
  - `src/instrumentation.ts` exports `onRequestError`. It captures and then flushes (same CPU-throttling reason).
- **Browser:**
  - The root layout renders `<script id="sentry-config" type="application/json">` with `{dsn, environment, release}` from the server's runtime env. It's not executable, and `<` is escaped.
  - `src/instrumentation-client.ts` reads it and initialises, waiting for `DOMContentLoaded` if needed.
  - So the **same image** reports as staging or production correctly.
- **`app/global-error.tsx`** captures render errors that escape every boundary.
- **Source maps** are covered in §5.

## 4. PII scrubbing: three layers

1. **What the SDK collects: almost nothing.**
   - Sentry v11 replaced `sendDefaultPii` with `dataCollection`, whose **defaults collect** user info, cookies, headers, request and response bodies, query parameters, stack-frame local variables and database query data. This was found while building.
   - `minimalDataCollection()` in `@cdo/observability` turns all of it off, apart from three allow-listed request headers. Every SDK uses it.
2. **`@cdo/observability`**, a new compiled package with no dependencies. Both apps run its `scrubEvent` in `beforeSend` and its `scrubBreadcrumb` in `beforeBreadcrumb`:
   - **Request data:** drops cookies, the body, the query string and environment variables. Keeps only allow-listed headers (`user-agent`, `content-type`, `x-request-id`) and strips the query from URLs.
   - **User:** keeps only `id`, a pseudonymous ID once auth exists. Drops `email`, `ip_address` and `username`.
   - **Everything else:**
     - any key matching `password|secret|token|authorization|cookie|session|api_key|credential|dsn|database_url` becomes `[Filtered]`
     - every email address in any string becomes `[email]`, including exception messages (MySQL's duplicate-key errors quote values)
3. **Sentry's server-side scrubbers:** "Data Scrubber", "Use Default Scrubbers" and "Prevent Storing of IP Addresses" are switched on in each project (checklist). This is defence in depth if code misses something.

## 5. Source maps: uploaded in CI, never served

- **They're built and uploaded inside the Docker build stage**, during the staging job's single build.
  - The token arrives as a **BuildKit secret** (`--mount=type=secret`). It's **never an `ARG`**, because `ARG` values are visible in `docker history`.
  - With no token (PR CI, local builds), the upload is skipped and the build still succeeds.
- **API:**
  1. `sentry-cli sourcemaps inject dist` writes debug IDs into the JS and maps.
  2. `sentry-cli sourcemaps upload --release <version> dist` uploads them.
  3. Every `*.map` is deleted before `pnpm deploy`, so maps live in Sentry, not in images.
- **Web:** `withSentryConfig` uploads after `next build` (Turbopack supported).
  - `sourcemaps.deleteSourcemapsAfterUpload` (default `true`) deletes client maps.
  - `productionBrowserSourceMaps` stays off, so no `.map` is ever under `/_next/static`.
- **Proof in every deploy:** the smoke test takes a JS chunk URL from the page and requests `<chunk>.map`. It **must be 404**.
- **Matching uses debug IDs, not file paths,** so production's promoted image (same bytes) resolves with the maps uploaded during the staging build.

**The token is the pipeline's first GitHub secret:**
- `SENTRY_AUTH_TOKEN` is stored on the **`staging`** environment only, since that's where images are built.
- It's an **organization token, whose scope is limited to CI**: it can upload source maps and create releases, and nothing else.
- Keeping it in Secret Manager instead would cost a paid secret version, and the deploy identity would have to read it. That's a worse trade for a token that can only upload.

## 6. Uptime (Better Stack free)

**Four monitors, checked every 3 minutes from several regions, alerting by email:**

| Monitor | URL | Passes when |
|---|---|---|
| production api | `<api>/health/ready` | 200 and the body contains `"status":"ready"` |
| production web | `<web>/api/health` | 200 |
| staging api | `<staging-api>/health/ready` | 200 and the body contains `"status":"ready"` |
| staging web | `<staging-web>/api/health` | 200 |

**Why these endpoints:**
- `/health/ready`, not `/health`, for the api: users need the API *and* its database. Liveness alone would stay green while every request fails.
- web's `/api/health` checks the server itself.

**Settings:**
- **Confirmation period:** 3 minutes. One failed check isn't an outage, but a cold start or a blip would otherwise page.
- **Request timeout:** 15 s, so a 2 s cold start passes.
- **Side effects,** both acceptable:
  - The checks keep an instance warm-ish, at a negligible cost of about 30k requests a month against a 2M free tier.
  - They touch the database every 3 minutes, which also stops Aiven from powering off an "unused" free service.

## 7. Alert policy (what reaches the inbox)

| Event | Alert? | Why |
|---|---|---|
| **Sentry:** a new issue in **production** | **Email** | Something broke that never broke before |
| **Sentry:** a resolved production issue regresses | **Email** | A fix didn't hold |
| Sentry: staging issues, repeat events of a known issue, any 4xx | No email; visible in Sentry | Expected while developing, or already known: emailing them trains you to ignore email |
| **Uptime:** production down for 3+ minutes | **Email** | Users are affected |
| Uptime: staging down for 3+ minutes | Email (requested), lower priority | Usually Aiven powered off, or a bad deploy |
| A failed deploy or migration | GitHub's failed-workflow email + a Sentry issue from `migrate` | You were the one deploying |

**Rule of thumb:** an alert must be **actionable, new and user-affecting**. Everything else goes to a page you check, not an inbox you're interrupted by.

## 8. Deliberate test errors (owner-only)

**API:**
- `node dist/observability/send-test-error.js` captures a `DeliberateTestError` with the tag `deliberate_test=true`, flushes, and prints the event ID.
- **In a deployed environment:** `gcloud run jobs execute migrate --args=dist/observability/send-test-error.js --wait`.
  - It's the same image, env, DSN, environment and release.
  - It needs your Google Cloud access. **No public endpoint.**

**Web:**
- `/debug/errors` has two buttons, "Throw in the browser" and "Throw on the server". It renders only when `DEBUG_PAGES_ENABLED=true`, and is `noindex`.
- **Staging:** `deploy.sh` sets the flag `true`.
- **Production:** it's `false`. To test production, enable it temporarily with `gcloud run services update web --update-env-vars DEBUG_PAGES_ENABLED=true`. The next deploy reverts it, because the manifests are declarative.

**Risk:**
- **The DSN is public by design,** so anyone can already send events to it. A gated page adds no new exposure.
- The test errors share a fingerprint, so repeats count against **one** issue, and don't trigger fresh "new issue" emails.

**Uptime alerts:** a temporary Better Stack monitor on a URL that returns 404 proves the email path (runbook).

## 9. Backups (verified 2026-10-04)

- **Aiven's free MySQL keeps a "single backup only for disaster recovery".** It has **no PITR and no forking**, and Aiven restores by forking. So **we cannot restore it ourselves**: that backup protects against Aiven losing the node, not against our mistakes.
- **ADR-005 said "limited backups"** and is corrected in this PR.
- **Phase 0 recovery is therefore our own logical dump.**
  - `mysqldump --single-transaction`, encrypted and stored outside the repo.
  - **Taken before any risky migration**, and before Phase 1's switch.
- **Phase 1 (Cloud SQL) adds automated backups and PITR.**
- [docs/runbooks/restore-database.md](../runbooks/restore-database.md) covers both phases and the restore drill.

## 10. Testing

| What | How |
|---|---|
| **Scrubbing** | Unit tests in `@cdo/observability`: every rule, plus a realistic Sentry event |
| **Filter** | Reports a thrown `Error` and a 500 `HttpException` but not a 404/400, flushes before the response, and attaches path-without-query and the request ID. Tested with Sentry's test transport. |
| **Env** | `SENTRY_ENVIRONMENT` is required with a DSN. An invalid DSN is rejected. |
| **End to end, locally** | A local fake Sentry endpoint receives the API's test error and a web server error. We assert environment, release and scrubbed content. |
| **Images (CI)** | Both build with **no token** (no upload attempted). The smoke test's `.map` → 404 check runs against the images. |
| **Not testable here** | Real uploads, the real alert rules, and Better Stack all need the founder's accounts. The deliberate test errors are the acceptance test. |
