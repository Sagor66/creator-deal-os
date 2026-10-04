# ADR-005: Hosting and environments

- **Status:** Accepted
- **Date:** 2026-10-04
- **Decided by:**
  - **Founder** (budget): "$0 in the initial phase. It's a personal project for now, and it will become a real product."
  - **Engineering** (vendors, region, environments), under CLAUDE.md rule 5.
- **Related:**
  - [issue #10](https://github.com/Sagor66/creator-deal-os/issues/10) (first deploy)
  - [ADR-001](001-monorepo-structure.md) (one slim image per app)
  - [ADR-002](002-orm-choice.md) (MySQL 8.4; migrations run as a release step)
  - [ADR-000](000-billing-provider.md) (Stripe test mode until a company exists)
  - [research §11](../product/research.md) (GDPR)
  - [architecture.md](../architecture.md)

## Context

**What has to run:**
- **API:** NestJS.
- **Web:** Next.js, server-rendered.
- **Database:** MySQL 8.4 (ADR-002; `compose.yaml` already pins 8.4).
- **Later:**
  - Redis for BullMQ (M4).
  - Private file storage for contracts (M3).
  - A transactional email provider (M2).

  Each of these gets its own ADR when its milestone arrives.

**Constraints:**
- **$0 until launch.** This stays a personal, non-commercial project until the private beta. Real creators' data arrives at M5.
- **Two environments with fully separate data:** staging and production, plus local.
- **EU hosting.**
  - GDPR doesn't require it: Chapter V only restricts *transfers*.
  - But once we have an EU company, hosting the core database in the EU means it involves no transfer at all.
  - It also keeps us independent of the EU-US Data Privacy Framework. That framework faces a pending appeal (C-703/25 P), and the June 2026 *Trump v. Slaughter* ruling, which affects the FTC's independence, adds to the doubt [EC](https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/rules-international-data-transfers_en), [EUR-Lex](https://eur-lex.europa.eu/eli/C/2025/6610/oj/eng).
- **Production-shaped from day one** (issue #10):
  - deploys from `main`
  - HTTPS
  - secrets in the platform's store
  - readiness gating releases
  - migrations run before new code takes traffic
- **A solo founder.** Keep moving parts few, and keep experience that transfers to other jobs.

**Facts checked 2026-10-04:**

| Fact | Source |
|---|---|
| **Managed MySQL with point-in-time recovery (PITR) is never free.**<br>Cheapest options: RDS db.t4g.micro ≈ $12–15/mo, Cloud SQL db-f1-micro ≈ $8 (shared core, no SLA), DigitalOcean $15.<br>Aiven offers PITR only from $75. PlanetScale Vitess has no PITR. Render and Fly offer no managed MySQL. | [RDS](https://aws.amazon.com/rds/mysql/pricing/), [Cloud SQL](https://cloud.google.com/sql/pricing), [DO](https://docs.digitalocean.com/products/databases/mysql/details/pricing/), [Aiven](https://aiven.io/pricing/mysql), [PlanetScale](https://planetscale.com/docs/postgres-vs-vitess) |
| **Aiven free MySQL** is real MySQL 8.4: 1 CPU, 1 GB RAM, up to 8 GB of disk, no card required.<br>Limits: you can't choose the region, there's no VPC, no static IPs, and only limited backups. Services may be powered off when idle. | [Aiven free plan](https://aiven.io/docs/platform/concepts/free-plan) |
| Aiven free plans run on DigitalOcean. In Europe that means Amsterdam, London or Frankfurt. | secondary source, [Aiven](https://aiven.io/pricing/mysql) |
| **TiDB Starter** is free and in Frankfurt, but it is *not* MySQL.<br>Its default collation is `utf8mb4_bin`, it has no `SKIP LOCKED`, and auto-increment IDs aren't sequential. | [TiDB compatibility](https://docs.pingcap.com/tidbcloud/mysql-compatibility) |
| **Oracle's Always Free MySQL HeatWave** has no PITR and keeps backups for only 1 day. It's reachable only from inside Oracle's private network. | [Oracle](https://blogs.oracle.com/mysql/heatwave-always-free-tier-disaster-recovery-support) |
| **Cloud Run's free tier** comes **per billing account, with no end date**: 2M requests, 180k vCPU-seconds and 360k GiB-seconds each month. It needs a billing account with a card.<br>Other free allowances: Artifact Registry 0.5 GB, Secret Manager 6 active secret versions, Logging 50 GiB. | [GCP free tier](https://docs.cloud.google.com/free/docs/free-cloud-features) |
| **Cloud Run health checks:**<br>• Startup and liveness probes are GA.<br>• The readiness probe is **Beta**.<br>• A container that fails its startup probe is shut down, so the new revision never becomes ready. | [Cloud Run health checks](https://docs.cloud.google.com/run/docs/configuring/healthchecks) |
| **Cloud Run domain mapping:**<br>• Free, with managed TLS certificates.<br>• In **Preview**, and not available in every region (`europe-west4` is supported).<br>• Google recommends a global load balancer (≈ $18/mo) for production. | [Domain mapping](https://docs.cloud.google.com/run/docs/mapping-custom-domains) |
| **Render free:**<br>• Sleeps after 15 minutes idle, then takes about a minute to wake.<br>• 750 instance hours per workspace each month. | [Render free](https://render.com/docs/free) |
| **Vercel Hobby** is non-commercial only. New projects default to a US region. | [Vercel](https://vercel.com/docs/limits/fair-use-guidelines) |
| **Fly.io** has no free tier. **Railway** offers a trial, then $5/mo Hobby. **AWS App Runner** is closed to new customers. | [Fly](https://docs.fly.io/about/pricing), [Railway](https://railway.com/pricing), [App Runner](https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html) |

## Options

**The free options**, for now:

| | A. **Cloud Run + Aiven** | B. Render free + Aiven | C. Vercel Hobby + Render free + Aiven | D. Oracle Always Free |
|---|---|---|---|---|
| Cost | $0 (see note 1) | $0 | $0 | $0 |
| Real MySQL 8.4 | Yes (Aiven) | Yes (Aiven) | Yes (Aiven) | Yes (HeatWave) |
| Cold start when idle | **~1–3 s** (scale to zero) | **~60 s** | ~60 s (API) | None (always-on VM) |
| Migrations before traffic | **Cloud Run job, then deploy** | Run from CI against a public DB | Run from CI | Our own scripts |
| Health checks | **Startup + liveness probes (GA)** | Health check path | Split across 2 platforms | Our own |
| Keyless CI (OIDC) | **Workload Identity Federation** | Deploy hook URL (a secret) | Tokens | SSH key |
| Rollback | **Shift traffic to an old revision instantly** | Redeploy | Redeploy | Our own |
| Ops load | Low | Lowest | Medium (3 vendors) | **High** (a VM to patch; idle VMs can be reclaimed) |
| Path to production | **Same project; add Cloud SQL, then a load balancer** | Replatform | Replatform | Replatform |

Note 1: storage beyond Artifact Registry's free 0.5 GB costs $0.10/GB-month. A cleanup policy keeps us under it, or at a few cents.

**The paid options**, for when we leave the free tier (both environments, before tax; from the hosting analysis of 2026-10-04):

| | Now | M4 (+ Redis, worker) | 100 paying users | 1,000 paying users | Interview value |
|---|---|---|---|---|---|
| **GCP: Cloud Run + Cloud SQL** | ~$50 | ~$110 | ~$120 | ~$300 | Medium–high |
| AWS: ECS Fargate + RDS (eu-west-1) | ~$124 | ~$156 | ~$165 | ~$310 | **Highest** |
| DigitalOcean: App Platform + Managed MySQL | ~$55 | ~$100 | ~$100 | ~$400 (with a standby) | Low–medium |
| Railway | ~$30 | ~$35 | ~$40 | ~$150 (rough; billed on usage) | Low |

## Decision

**Phase 0 (now, a personal project, no real user data): Google Cloud Run's free tier, with Aiven's free MySQL 8.4, in the EU.**

**Compute:**
- **Two Cloud Run services:** `api` and `web`.
- **One Cloud Run job:** `migrate`, using the API image.
- **Region `europe-west4` (Netherlands):**
  - It's in the EU.
  - Tier-1 pricing.
  - It supports domain mapping.
  - It's within about 10 ms of all three of Aiven's European locations.

**Database:**
- One **Aiven free MySQL 8.4** service per environment, connected over **verified TLS**.
- **Two users per environment:**
  - a **DML-only user** for the API
  - a **DDL user** for the migration job only

**Environments:**
- **Local:** `compose.yaml`.
- **Staging and production:** each has its own GCP project, Aiven project, MySQL service, secrets and service accounts. Nothing is shared except the billing account.
- **Production data never leaves production.**

**Delivery** (details in [docs/design/deployment.md](../design/deployment.md)):
1. A merge to `main` passes CI.
2. The images are built once.
3. Staging: migrate, then deploy, then smoke-test.
4. Production waits for a **manual approval** (GitHub Environment), then deploys **the same image digests**.
- **CI holds no long-lived cloud keys.** It uses Workload Identity Federation, and production credentials are only issued to the approved `production` job.

**Domains:**
- **None yet.** Cloud Run's `*.run.app` URLs are HTTPS-only, and `.app` is on browsers' HSTS preload list.
- The `app.` / `api.` / `staging` subdomain plan and its DNS records are documented for when a domain is bought.

**Phase 1: before the first real user's data (the M5 private beta at the latest), or as soon as a free-tier limit bites:**
- **Move MySQL to Cloud SQL for MySQL 8.4** in the same region and project: 7-day PITR, about $10–30/mo per environment.
  - Compute, pipeline and images stay as they are.
  - The roadmap's M5 restore drill runs against Cloud SQL.
- **Custom domain:** domain mapping for staging. For production, a global load balancer (≈ $18/mo), or domain mapping while it's acceptable.
- **Redis** (M4) and **storage** (M3) get their own ADRs, preferring a free or near-free option in the same region.

**Phase 2: paying customers (after the company exists, brief §8):**
- Re-decide in a new ADR: stay on GCP (Cloud SQL with a standby, minimum instances so there are no cold starts), or move to AWS (the higher interview value, analysed above).
- The images, the migration job and the pipeline's shape move with us. Only the platform-specific deploy steps change.

## Consequences

**Positive:**
- **$0 a month**, with a production-shaped deployment: two environments, gated releases, keyless CI, migrations before traffic, and instant rollback.
- **The step to a real product is a database swap,** not a re-platform.
- **No secrets in GitHub at all.** CI gets short-lived credentials through federation.
- **Transferable experience:** containers, IAM, OIDC federation, probes, revisions and expand/contract migrations look the same on any cloud.

**Negative, and accepted for Phase 0:**
- **No point-in-time recovery.** Aiven free keeps limited backups.
  - Acceptable only because there is **no real user data**.
  - It's the hard trigger for Phase 1.
- **The database endpoint is public.** The free tier has no VPC or static IPs, and Cloud Run's outbound IP addresses change, so an IP allowlist can't help.
  - Mitigations: verified TLS, long random passwords, and least-privilege users.
  - The API user can't run DDL.
- **Aiven may power off an idle free service.** Readiness then fails, so a deploy is blocked until it's powered on again (runbook).
- **Cold starts of about 1–3 s** after idle, because we scale to zero. That's fine for a personal project. Phase 2 sets a minimum of one instance.
- **A card is on file with Google.**
  - Mitigations: a budget alert, and capped maximum instances per service.
- **Free tiers change.** Re-check this ADR's facts before Phase 1.
- **Two vendors** for the GDPR sub-processor list: Google (hosting) and Aiven (database). Phase 1 removes Aiven.
- **The readiness probe is Beta,** so we don't use it. Readiness gates each *release* through the startup probe instead. Once an instance is up, a database outage shows up as errors, not as the instance being taken out of rotation. Revisit when the readiness probe is GA.

## When we'd revisit
- **Phase 1 triggers:**
  - a real user's data is about to be stored
  - Aiven powers off or throttles the database often enough to slow work
  - 8 GB of disk or 1 GB of RAM is no longer enough
  - Cloud Run's free tier is exceeded two months running
- **Phase 2 triggers:**
  - a company exists and live billing is near (brief §8)
  - or the monthly bill passes about $50
- **Leave GCP** if a client, employer or interview story needs AWS more than the migration costs. The paid comparison above is the starting point.
