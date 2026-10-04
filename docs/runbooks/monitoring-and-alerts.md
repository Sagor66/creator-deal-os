# Runbook: monitoring and alerts

- **Applies to:** [ADR-006](../adr/006-error-tracking-and-uptime.md): Sentry (EU, free) for errors, Better Stack (free) for uptime.
- **Design:** [docs/design/observability.md](../design/observability.md).
- **Logs** stay in Cloud Logging ([deploy and rollback §10](deploy-and-rollback.md)).

> **Secrets:** exactly one is involved: the Sentry org token.
> - It goes **only** into GitHub's environment-secret form.
> - Never into a chat, a file, a command line or a commit.
> - The DSNs are **not** secret (browsers receive them anyway), so they're plain variables.

## 1. One-time setup

### 1.1 Sentry
- [ ] **Create the account at sentry.io.** When creating the organization, set **Data Storage Location → European Union**.
  - **This can't be changed later** (a new organization would be the only way).
  - Note the org **slug**.
- [ ] **Create two projects:** `cdo-api` (platform: Node.js) and `cdo-web` (platform: Next.js).
  - Skip the setup wizards: the code is already wired.
- [ ] **For each project, Settings → Client Keys (DSN):** copy the DSN.
- [ ] **For each project, Settings → Security & Privacy:**
  - **Data Scrubber:** on
  - **Use Default Scrubbers:** on
  - **Prevent Storing of IP Addresses:** on

  This is the server-side layer; the code already scrubs before sending.
- [ ] **For each project, Settings → Inbound Filters:** on for browser extensions, legacy browsers, web crawlers and localhost (noise that costs quota).
- [ ] **For each project, Settings → Client Keys → Configure:** if your plan offers a **rate limit**, set about 100 events per minute. The DSN is public, so this caps abuse.
- [ ] **Alerts, for each project.** Delete or edit Sentry's default rule so that **only** these fire:
  1. **"Production: new issue":**
     - *When:* a new issue is created.
     - *If:* the event's environment **equals `production`**.
     - *Then:* email you.
  2. **"Production: regression":**
     - *When:* the issue changes state from resolved to unresolved.
     - *If:* environment equals `production`.
     - *Then:* email you.

  Staging issues stay visible in Sentry without emailing you (§4 explains why).
- [ ] **The org token:** Settings → Developer Settings → **Organization Tokens** → create `github-actions-sourcemaps`.
  - Organization tokens are limited to CI work (uploading source maps, creating releases) and can't read your error data.
  - Copy it straight into GitHub (next step), then close the page.

### 1.2 GitHub
- [ ] Settings → Environments → **`staging`** → *Add environment secret* `SENTRY_AUTH_TOKEN`: paste the org token **here, in GitHub's form**.
  - Only `staging` needs it, because images are built once, in the staging job.
- [ ] **Repository variables** (not secrets):
  ```sh
  gh variable set SENTRY_ORG --body "<org-slug>"
  gh variable set SENTRY_PROJECT_API --body "cdo-api"
  gh variable set SENTRY_PROJECT_WEB --body "cdo-web"
  gh variable set SENTRY_DSN_API --body "<cdo-api DSN>"
  gh variable set SENTRY_DSN_WEB --body "<cdo-web DSN>"
  ```
- [ ] **The next deploy** (merge, or Actions → Deploy → *Run workflow*):
  - uploads source maps during the staging build
  - starts tagging events with environment and release

  Until these are set, deploys still work and error tracking is simply off.

### 1.3 Better Stack (uptime)
- [ ] Sign up at betterstack.com (free plan). Alerts go to your account email by default.
- [ ] **Create four monitors.** Get the URLs from the Deploy run's environment links, or `gcloud run services describe <api|web> --format='value(status.url)' --project <project> --region europe-west4`.

| Name | Type | URL | Expect |
|---|---|---|---|
| `prod api ready` | Keyword | `<prod api>/health/ready` | contains `"status":"ready"` |
| `prod web` | Status code | `<prod web>/api/health` | 200 |
| `staging api ready` | Keyword | `<staging api>/health/ready` | contains `"status":"ready"` |
| `staging web` | Status code | `<staging web>/api/health` | 200 |

- [ ] **For each monitor:**
  - **Check frequency:** 3 minutes.
  - **Confirmation period:** 3 minutes, so one failed check doesn't page.
  - **Request timeout:** 15 s, so cold starts pass.
  - **Regions:** Europe + US.
  - **Alert:** email.

## 2. Prove the alerts work, end to end

**Do this once after setup, and after any change to alert rules.** Each test should end with an email in your inbox. If one doesn't arrive, that alert path is broken.

### 2.1 API → Sentry → email (production)
```sh
gcloud run jobs execute migrate --project <prod-project> --region europe-west4 --wait \
  --args=dist/observability/send-test-error.js
```

**Expected:**
- The job succeeds. Its log says "test error delivered" with an event ID.
- In Sentry `cdo-api`: a **`DeliberateTestError`** with environment `production`, release = the deployed commit, and tag `deliberate_test=true`.
- **An email,** "new issue".

**Then:** in Sentry, **Resolve** the issue. The next run of this test triggers the *regression* email, which proves the second rule too.

**How it works:** it reuses the migrate job's image and environment (the real DSN, environment and release), but runs the test script instead. Only someone with Google Cloud access can run it, and there's no public endpoint.

### 2.2 Web → Sentry, browser and server (staging)
1. Open `<staging web>/debug/errors` and click **Throw in the browser**, then **Throw on the server**.
2. In Sentry `cdo-web` (environment `staging`): two `DeliberateTestError`s.
3. **The stack traces show original file names and lines,** for example `throw-buttons.tsx`, not minified `0m1b…js`. That proves the source maps uploaded from CI.

**No email: staging doesn't alert, by design.**

**To test the web's production email path,** switch the page on temporarily:
```sh
gcloud run services update web --update-env-vars DEBUG_PAGES_ENABLED=true --project <prod-project> --region europe-west4
# click the buttons at <prod web>/debug/errors, check your inbox, then:
gcloud run services update web --update-env-vars DEBUG_PAGES_ENABLED=false --project <prod-project> --region europe-west4
```
The next deploy resets it to `false` anyway, because the manifests are declarative.

### 2.3 Uptime → email
1. In Better Stack, add a temporary monitor, `alert test`, on `<staging api>/health/does-not-exist`. It returns 404.
2. Within about 6 minutes you should get an incident email.
3. Acknowledge it, then **delete the monitor**.

## 3. When an alert arrives

**A Sentry "new issue" or "regression":**
1. Open the issue and read:
   - the stack trace (source-mapped)
   - the **release** (which deploy introduced it)
   - the `route` and `request_id` tags
2. Use `request_id` to find the full story in the logs:
   ```sh
   gcloud logging read 'jsonPayload.requestId="<request_id>"' --project <project> --limit 50
   ```
3. **Is it user-affecting and new in this release?** Roll back (deploy and rollback §4.1), then fix forward.
4. Fix in a PR. In Sentry, use **Resolve → In next release**, so a recurrence after the fix is flagged as a regression.

**A `migrate` job failure in Sentry:** the deploy already stopped before the API changed. Follow deploy and rollback §5–6.

**An uptime incident:**
- `* api ready` failed while `* web` passed: open `<api>/health/ready` to see which check is `down`.
  - `mysql: down`: is Aiven powered off? See deploy and rollback §8.
- Everything is down:
  - Check the latest Deploy run, and `gcloud run revisions list`.
  - Check Google Cloud's status page.
- It recovered by itself within minutes: note it. If it happens repeatedly, find out why: cold starts? database sleeps?

## 4. Keeping alerts useful (avoid alert fatigue)

- **Every alert must be actionable, new and user-affecting.** If you get an email you don't act on, change the rule, don't learn to ignore the inbox.
- **What deliberately doesn't email you:**
  - staging errors
  - repeat events of a known issue
  - 4xx client errors (the code never reports them)
- **Weekly, 10 minutes:**
  1. Skim staging issues in Sentry.
  2. Check usage against the 5k errors/month quota (Settings → Subscription).
  3. Resolve or archive what's handled.
  4. Check Better Stack for flapping monitors.
- **If a known noisy issue can't be fixed now:** use **Archive** (Sentry's word for ignore) with a condition, such as "until it escalates" or "until it happens 100 more times". Never a permanent mute.
- **Quota:** when the 5k errors run out, Sentry drops events until the month resets, and real errors go unseen. A runaway loop is itself a bug: fix it, or archive the issue so it stops counting.
