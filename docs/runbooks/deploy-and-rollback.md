# Runbook: deploy and roll back

- **Applies to:** [ADR-005](../adr/005-hosting-and-environments.md) Phase 0: Google Cloud Run (`europe-west4`) + Aiven free MySQL. One GCP project and one Aiven project per environment.
- **How it works:** [docs/design/deployment.md](../design/deployment.md).
- **Workflow:** [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml).

> **Secrets go in exactly one place: Secret Manager, through `infra/gcp/set-secret.sh`.**
> - Never put a password, database URL or token in a chat, issue, PR, commit, screenshot or shell command line.
> - GitHub holds **no secrets** for deploys, only non-secret variables.

## 1. First-time setup (once)

### At a glance: everything you set up by hand

**Accounts**

| What | Where | Notes |
|---|---|---|
| Google Cloud account + **billing account** | console.cloud.google.com | Needs a card. The free tier has no end date. Set a budget alert (step 1.2). |
| Aiven account | console.aiven.io | No card for free plans |
| `gcloud` CLI | your machine | `gcloud auth login` as the owner of both projects |
| GitHub admin on the repo | github.com | To create environments and variables |

**Secrets** (in Secret Manager, per environment; the values never leave Aiven, your terminal and Google)

| Secret | Value | Read by |
|---|---|---|
| `api-database-url` | `mysql://cdo_app:<password>@<host>:<port>/creator_deal_os` | `api` service only |
| `migrate-database-url` | `mysql://cdo_migrator:<password>@<host>:<port>/creator_deal_os` | `migrate` job only |
| `database-ca-cert` | Aiven's CA certificate (PEM) | `api` and `migrate` |

**GitHub variables** (not secrets)

| Variable | Scope | Value |
|---|---|---|
| `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_DEPLOYER_SERVICE_ACCOUNT` | each environment (`staging`, `production`) | printed by `bootstrap.sh` |
| `PUBLIC_WEB_URL`, `PUBLIC_API_URL` | each environment, **only once a domain exists** | e.g. `https://app.<domain>` |
| `DEPLOY_ENABLED` | repository | `true`, set **last** (it switches deploys on) |

**DNS records:** none until a domain is bought. When one is, see §9.

### 1.1 Accounts and tools
- [ ] Google Cloud: create a **billing account** (Billing → Manage billing accounts).
- [ ] Install the `gcloud` CLI, then `gcloud auth login`.
- [ ] Aiven: sign up. No card is needed.

### 1.2 Budget guard
- [ ] Billing → **Budgets & alerts** → create a budget of **$1/month** on the billing account, with email alerts at 50% and 100%.
  - **Budgets alert; they don't stop anything.** The hard caps are each service's `maxScale: 2` and scale-to-zero (`infra/cloudrun/*.yaml`).

### 1.3 Two Google Cloud projects
- [ ] Create `cdo-staging-<suffix>` and `cdo-prod-<suffix>` (project IDs are global, so add a suffix).
- [ ] Link both to the billing account.

### 1.4 Two Aiven databases (repeat for staging, then production)
- [ ] Create an Aiven project (`cdo-staging` / `cdo-production`).
- [ ] **Create service → MySQL → Free plan.** Choose Europe if you're offered a choice.
- [ ] From the service overview, **download the CA certificate** to `ca.pem`, outside the repo.
  - It isn't secret, but it's environment-specific.
- [ ] Generate two passwords **in your terminal**: `openssl rand -hex 24` (hex is URL-safe). Keep them only until step 1.5.
- [ ] Connect as `avnadmin` (the console's connection info, with `ca.pem`) and run the following.
  - The `mysql` client doesn't write statements containing `IDENTIFIED` to its history.

```sql
CREATE DATABASE creator_deal_os CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Runs migrations only (DDL).
CREATE USER 'cdo_migrator'@'%' IDENTIFIED BY '<migrator password>' REQUIRE SSL;
GRANT ALL PRIVILEGES ON creator_deal_os.* TO 'cdo_migrator'@'%';

-- The API: rows only, no schema changes (docs/design/deployment.md §3).
CREATE USER 'cdo_app'@'%' IDENTIFIED BY '<app password>' REQUIRE SSL;
GRANT SELECT, INSERT, UPDATE, DELETE ON creator_deal_os.* TO 'cdo_app'@'%';
```

- [ ] Note the host and port. URLs have **no `?ssl-mode=...`**: TLS is configured by the app (`DATABASE_TLS=verify`, which is the default in production).

### 1.5 Bootstrap Google Cloud, then add the secrets

```sh
ENVIRONMENT=staging    PROJECT_ID=<staging-project> infra/gcp/bootstrap.sh
ENVIRONMENT=production PROJECT_ID=<prod-project> STAGING_PROJECT_ID=<staging-project> infra/gcp/bootstrap.sh
```

**What it does,** idempotently:
- enables the APIs
- creates the `images` registry (keeps the 3 newest versions of each image)
- creates four service accounts and three empty secrets, stored only in `europe-west4`
- grants least-privilege roles
- sets up keyless GitHub federation, accepted only for this repo's matching GitHub Environment
- prints the `gh variable set` commands for step 1.6

**Then, for each environment:**
```sh
PROJECT_ID=<project> infra/gcp/set-secret.sh api-database-url        # prompts, input hidden: the cdo_app URL
PROJECT_ID=<project> infra/gcp/set-secret.sh migrate-database-url    # the cdo_migrator URL
PROJECT_ID=<project> infra/gcp/set-secret.sh database-ca-cert < ca.pem
```

### 1.6 GitHub
- [ ] Settings → Environments → **`staging`**:
  - Deployment branches: *Selected branches* → `main`.
  - No reviewers.
- [ ] Settings → Environments → **`production`**:
  - **Required reviewers:** you.
  - Leave *Prevent self-review* **off**, or you can't approve your own deploy.
  - Deployment branches: `main`.
- [ ] Run the four `gh variable set ... --env <environment>` commands `bootstrap.sh` printed, once per environment.
- [ ] **Last:** `gh variable set DEPLOY_ENABLED --body true` (a repository variable, which switches deploys on).

### 1.7 The first deploy is also the setup's test
1. Actions → **Deploy** → *Run workflow* (leave `ref` blank).
2. **Staging** job, in this order:
   1. build and push both images
   2. `1. Migrate` succeeds (on the first run it creates `__drizzle_migrations`)
   3. api ready
   4. web
   5. smoke test passes
3. Open the staging URL on the job (`web-…run.app`). The page should show **Readiness: ready** and the version (the first 12 characters of the commit).
4. **Production** waits for you → *Review deployments* → approve → the same steps, using the same digests.

If a step fails, §5 says what state the system is in and what to do.

## 2. Everyday deploy
1. **Merge a PR to `main`.**
2. **CI passes,** then **Deploy** starts on its own and updates **staging**.
3. **Check staging.** Then on the run page, use **Review deployments → production → Approve**.
   - Not approving is fine: the run just waits.
   - A newer merge queues behind it, and only the latest queued run is kept.

## 3. Verify a deploy
- **The run's smoke test is the verification.** It checks:
  - api: live, ready, and running the right version
  - web: live, reaches the api, sees it ready, and sends HSTS
- **By hand:**
  - `curl -s <api-url>/meta` shows the version.
  - `curl -s <api-url>/health/ready` shows each check.

## 4. Roll back

### 4.1 Instant: send traffic back to the previous revision (seconds; code only)
```sh
gcloud run revisions list --service api --project <project> --region europe-west4   # newest first
gcloud run services update-traffic api --to-revisions <previous-api-revision>=100 --project <project> --region europe-west4
# The same for web if it changed.
```
- **The next deploy sends traffic back to the latest revision** (`latestRevision: true` in the manifests).
- **So follow up** with a fix, or with §4.2.

### 4.2 Redeploy a known-good commit
Actions → **Deploy** → *Run workflow* → `ref` = the good commit's SHA (it must be on `main`).
- It rebuilds that commit and goes through staging, then approval, as normal.
- Images older than the newest 3 in a registry have been cleaned up. That's why this path rebuilds rather than relying on old images.

### 4.3 The schema is never rolled back
- **Migrations are forward-only and expand/contract,** so the previous code works with the new schema. That's what makes §4.1 safe.
- **To undo a schema change,** write a **new** migration. Never edit or delete an applied one: its hash is recorded.

## 5. When a deploy fails, what is serving?

| Failed at | State | Do |
|---|---|---|
| Build or push | Nothing changed | Fix and merge again |
| **1. Migrate** | Old code serving. Schema: see §6. | Read the job's logs (§10). Fix forward with a new migration. |
| Migrate: "destructive statement(s) lack allow-destructive" | Nothing applied | The guard worked. Make it expand/contract, or add `-- allow-destructive: <reason>` in a reviewed PR. |
| Migrate: "holds the lock" | Nothing applied | Another migration is running, or a dead one left a session. Wait 2 minutes and re-run. |
| **2. api** (revision not ready) | **Previous api revision still serving** | Usually readiness (the database is unreachable, see §8) or bad config (logs show `Invalid environment configuration`) |
| **3. web** | New api and old web serving: fine, because changes are backward-compatible | Fix and redeploy |
| **4. Smoke test** | New revisions serving | Roll back (§4.1) if users are affected, then investigate |

## 6. A migration failed halfway
- **MySQL commits each DDL statement on its own,** so a migration with several statements can be left half-applied.
  1. Look at what exists: `SHOW CREATE TABLE …` as `avnadmin`, and the newest rows of `__drizzle_migrations`.
  2. If the failed migration isn't recorded there, it will re-run next time. Make its statements safe to re-run (`IF NOT EXISTS`), or finish them by hand, carefully.
  3. Fix forward with a new migration. Never edit an applied one.
- **There is no point-in-time recovery in Phase 0** (ADR-005). Before a risky migration, take a manual dump as `avnadmin`.

## 7. Rotate a secret

**A database password, with no downtime** (MySQL dual passwords):
1. As `avnadmin`: `ALTER USER 'cdo_app'@'%' IDENTIFIED BY '<new>' RETAIN CURRENT PASSWORD;`
2. `PROJECT_ID=<project> infra/gcp/set-secret.sh api-database-url` with the new URL.
3. Actions → **Deploy** → *Run workflow*, so new revisions read the new version.
4. As `avnadmin`: `ALTER USER 'cdo_app'@'%' DISCARD OLD PASSWORD;`
5. Disable the old secret version:
   - `gcloud secrets versions list api-database-url --project <project>`
   - then `gcloud secrets versions disable <old> --secret api-database-url --project <project>`
   - The free tier allows 6 active versions in total.

**The same steps apply to `cdo_migrator` / `migrate-database-url`.**

**The CA certificate** (when Aiven announces a new one): `set-secret.sh database-ca-cert < new-ca.pem`, then redeploy.

**If a secret leaked:**
1. Rotate it immediately (steps above).
2. Check Aiven's connection logs.
3. Record it in the breach log (roadmap M5).

## 8. Aiven powered the database off
- **The symptoms:**
  - `/health/ready` reports `mysql: down`.
  - A deploy fails at migrate or at "api not ready".
- **Fix:**
  1. Aiven console → the service → **Power on**.
  2. Wait until it's *Running*.
  3. Re-run **Deploy** if one failed.
- **If this happens often,** it's a Phase 1 trigger (ADR-005).

## 9. Add the custom domain (once one is bought)

**The names** (design note §6):

| Environment | Web | API |
|---|---|---|
| production | `app.<domain>` | `api.<domain>` |
| staging | `staging.<domain>` | `api.staging.<domain>` |

**The steps:**
1. **Prove you own the domain:** `gcloud domains verify <domain>`. It opens Search Console.
   - Add the **TXT** record it gives you (`google-site-verification=…`) at the root of the domain.
2. **Map each name** to its service, in its environment's project:

```sh
gcloud beta run domain-mappings create --service web --domain app.<domain> --project <prod-project> --region europe-west4
gcloud beta run domain-mappings create --service api --domain api.<domain> --project <prod-project> --region europe-west4
gcloud beta run domain-mappings create --service web --domain staging.<domain> --project <staging-project> --region europe-west4
gcloud beta run domain-mappings create --service api --domain api.staging.<domain> --project <staging-project> --region europe-west4
```

3. **Add the DNS records** shown by `gcloud beta run domain-mappings describe --domain <name> …`. For subdomains, these are CNAMEs:

| Type | Name | Value |
|---|---|---|
| TXT | `@` | `google-site-verification=…` (from step 1) |
| CNAME | `app` | `ghs.googlehosted.com.` |
| CNAME | `api` | `ghs.googlehosted.com.` |
| CNAME | `staging` | `ghs.googlehosted.com.` |
| CNAME | `api.staging` | `ghs.googlehosted.com.` |

- **On Cloudflare DNS,** keep these records **DNS only** (grey cloud), or Google can't issue the certificates.
- **If the domain has CAA records,** allow `pki.goog`.
- **Certificates** usually take about 15 minutes, and up to 24 h.

4. **Point the smoke test at the public names:** set the GitHub environment variables `PUBLIC_WEB_URL` and `PUBLIC_API_URL`, per environment.
5. **Email DNS** (SPF, DKIM, DMARC) belongs to the email ADR (M2/M5), not here.

## 10. Where to look

```sh
# Logs (JSON; filter by requestId to follow one page view):
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="api"' --project <project> --limit 50
gcloud logging read 'resource.type="cloud_run_job" AND resource.labels.job_name="migrate"' --project <project> --limit 50

gcloud run revisions list --service api --project <project> --region europe-west4
gcloud run jobs executions list --job migrate --project <project> --region europe-west4
```

## 11. Costs and limits (Phase 0)

**Expected: $0.**
- **Cloud Run:** stays inside the free tier at personal-project traffic.
- **Artifact Registry:** past its free 0.5 GB, it costs $0.10/GB-month. The cleanup policy keeps the 3 newest versions per image, so expect cents at most.
- **Secret Manager:** 6 free active versions, and we use exactly 6. Disable old versions after a rotation.
- **Aiven free:** 1 CPU, 1 GB RAM, 8 GB of disk, no point-in-time recovery.

**When any of these limits starts to bite,** that's a Phase 1 trigger (ADR-005).
