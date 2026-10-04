# ADR-006: Error tracking and uptime monitoring

- **Status:** Accepted
- **Date:** 2026-10-04
- **Decided by:**
  - **Founder:** Sentry for errors; a free uptime service such as Better Stack or UptimeRobot.
  - **Engineering:** region, plans, alert policy (CLAUDE.md rule 5).
- **Related:**
  - [issue #24](https://github.com/Sagor66/creator-deal-os/issues/24)
  - [ADR-005](005-hosting-and-environments.md): $0, EU
  - [design note](../design/observability.md)
  - roadmap M5: "Error tracking on API and web (ADR); uptime check and alerting"

## Context

**What exists today:**
- The deployed apps (ADR-005) write structured JSON logs to Cloud Logging.
- Nothing *tells* anyone when something breaks.

**What we need, within the $0 constraint:**
- **Errors:** from the API (NestJS), the web server and the browser (Next.js), with:
  - readable stack traces (source maps)
  - environment and release
  - no personal data
- **Uptime:** checks from outside our own infrastructure, so that a failure of the platform, DNS or TLS is still seen.
- **Email alerts** that stay rare enough to be read.
- **Data handling:** error events can contain personal data, so the vendor becomes a GDPR sub-processor. EU storage keeps ADR-005's "core data in the EU".

**Facts, checked 2026-10-04:**

| Fact | Source |
|---|---|
| **Sentry Developer (free):** 5,000 errors a month, 1 user, email alerts | [Sentry pricing (secondary)](https://costbench.com/software/developer-tools/sentry/free-plan/) |
| **Sentry data storage location:** EU available, chosen when the organization is created, **cannot be changed later**. Events, releases and source maps stay in the region; some account metadata stays in the US. | [Sentry docs](https://docs.sentry.io/organization/data-storage-location/) |
| **Sentry SDK v11.4.0** supports Next 14–16 (Turbopack) and Nest 8–12. Client source maps are deleted after upload by default (`sourcemaps.deleteSourcemapsAfterUpload: true`). | npm; [Sentry Next.js source maps](https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/) |
| **Sentry's NestJS filter skips `HttpException`s by default**: they're control flow | [Sentry NestJS](https://docs.sentry.io/platforms/javascript/guides/nestjs/) |
| **Better Stack free:** 10 monitors and heartbeats, 1 status page, email and Slack alerts, 3-minute checks (secondary) | [Better Stack pricing](https://betterstack.com/pricing), [comparison](https://betterstack.com/community/comparisons/better-stack-vs-uptimerobot/) |
| **UptimeRobot free:** personal or non-commercial use only since late 2024; 5-minute checks | [secondary](https://dev.to/velprove/uptimerobot-commercial-use-free-alternatives-for-business-sites-in-2026-5d75) |

## Options

**Error tracking:**

| | **Sentry (free, EU)** | Google Cloud Error Reporting | GlitchTip (self-hosted, Sentry-compatible) |
|---|---|---|---|
| Browser errors + source maps | **Yes** | No (server logs only) | Yes |
| Node / Nest errors | Yes | Yes, from logged stack traces | Yes |
| Releases, regressions, issue grouping | **Yes** | Basic grouping | Yes |
| Cost / ops | $0, 5k errors a month, managed | $0, built in | Needs an always-on host + Postgres: not $0, and ops work |
| EU data | Yes (region chosen at creation) | Yes (our project) | Wherever we host it |
| Interview transferability | **High** (the industry default) | Medium | Low |

**Uptime:**

| | **Better Stack (free)** | UptimeRobot (free) | Cloud Monitoring uptime checks | Uptime Kuma (self-hosted) |
|---|---|---|---|---|
| Interval | **3 min** | 5 min | 1 min+ | Any |
| Commercial use on free | **Yes** | **No** (personal only) | n/a | n/a |
| Independent of our cloud | **Yes** | Yes | No: same provider as what it checks | Depends on the host |
| Cost | $0 (10 monitors) | $0 (50 monitors) | Alerting priced separately (unverified) | A host to run |

## Decision

**Error tracking: Sentry, free Developer plan.**
- **Region:** an organization in the **EU data region**.
- **Projects:** `cdo-api` and `cdo-web`.
- **Scope:** errors only, with no tracing and no replay.
- **Tagging:** environment and release come from runtime config, so one image serves both environments.
- **Source maps:** uploaded from the CI build with an organization token limited to CI, and never served.
- **PII:** scrubbed in-process by a shared `@cdo/observability` package, plus Sentry's server-side scrubbers.

**Uptime: Better Stack, free plan.**
- **Monitors:** four, on api `/health/ready` and web `/api/health` in each environment.
- **Checks:** every 3 minutes, with a 3-minute confirmation period.
- **Alerts:** email.

**Alert policy:**
- **Email for:** a new or regressed **production** Sentry issue, and a service down for 3+ minutes.
- **No email for:** staging errors, repeat events, or 4xx.

**Logs:** stay in Cloud Logging. Sentry events carry the request ID that links back to them.

Implementation details are in the [design note](../design/observability.md).

## Consequences

**Positive:**
- **We hear about failures from tools, not users:** API, web-server and browser errors, migration failures and outages, each tagged with the release that caused it.
- **Readable browser stack traces,** with no source maps exposed to the public.
- **Still $0, and still EU-resident** for error data.

**Negative, and accepted:**
- **Two more sub-processors:** Sentry (EU region; it processes potentially personal data, minimised by scrubbing) and Better Stack (it only fetches public health URLs, so no personal data). The M5 sub-processor list must name them.
- **The first secret stored in GitHub:** `SENTRY_AUTH_TOKEN` on the `staging` environment. Its scope is limited to CI (upload and releases), so a leak can't read error data.
- **A 5,000 errors/month cap.** A runaway bug, or someone deliberately spamming the public DSN, can exhaust it and hide later errors until the month resets. Mitigations: Sentry inbound filters and a per-key rate limit if the plan offers one.
- **Error responses take up to 2 s longer**, because we flush before responding (Cloud Run CPU throttling).
- **One user** on Sentry's free plan. Fine for a solo founder.

## When we'd revisit
- **The quota is regularly hit,** or we need tracing: move to Sentry Team, or sample.
- **We need on-call escalation** (SMS or phone, multiple people): Better Stack paid, or similar.
- **Phase 2 moves to AWS:** uptime is unaffected. Sentry is cloud-agnostic, so nothing changes there either.
- **A customer requires that error data never leaves our cloud:** Cloud Error Reporting for the server side, with browser errors routed through our own endpoint.
