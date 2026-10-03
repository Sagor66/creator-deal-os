# Roadmap

**Date:** 2026-10-03

- **The product:** [product/brief.md](product/brief.md).
- **The evidence:** [product/research.md](product/research.md).
- **Changes:** this file changes by PR when scope moves. Each milestone ends with a demo-able state and its own exit check.

## Running alongside M1–M3: validation

The brief rests on assumptions, not interviews (see "Assumptions to validate" in the brief). So this track runs **in parallel with engineering**, not after it:

- **Interviews:** 10–15 fitness/lifestyle creators from the founder's network. Script and notes go in `docs/product/interviews/`, anonymised.
- **Their trackers:** collect 3+ real deal trackers (spreadsheets or Notion) to check the data model against.
- **Decision gate before M4:** re-read the brief against what interviews found and cut or re-scope M4 if needed.

## M1: Foundation

**Goal:** an empty but production-shaped monorepo, where every later PR runs through the same checks.

**Scope:**
- **Monorepo:** pnpm workspaces + Turborepo.
  - `apps/api`: NestJS, TS strict.
  - `apps/web`: Next.js App Router, Tailwind, shadcn/ui, TanStack Query.
  - `packages/schemas`: zod.
  - `packages/config`: tsconfig and eslint.
- **Tooling:** ESLint, Prettier, Conventional Commits, `.github/pull_request_template.md`.
- **Config:** zod-validated env in both apps. The app refuses to start on bad config. `.env.example` is committed.
- **Database:**
  - MySQL 8 in `docker compose` for local dev.
  - ORM and migrations (ADR-002).
  - Testcontainers harness so repository tests run against real MySQL.
- **CI:** GitHub Actions runs lint, typecheck, test and build on every PR.
- **Basics:**
  - API: `/health` endpoint, structured JSON logging, request IDs.
  - Web: a placeholder page that calls the API.
- **Docs:** `docs/architecture.md` skeleton, an ADR template, and a devlog entry.

**Exit:** a PR runs green CI; `pnpm dev` starts both apps; one repository test passes against real MySQL in CI.

## M2: Workspaces + auth

**Goal:** multi-tenancy that is *proven*, not assumed.

**Scope:**
- **Accounts:** sign-up, login, logout, email verification, password reset. Session approach and library go in an ADR.
- **Workspaces:**
  - A workspace (tenant) is created at sign-up.
  - Membership roles: `owner`, `member`. That is enough for a creator plus an assistant or manager.
  - Invite a member by email.
- **Tenancy model:** shared schema with a `workspace_id` on every tenant-owned table (ADR).
  - The tenant context is resolved once per request.
  - Repositories cannot query without it.
- **Tenant-isolation test suite:** every tenant-owned endpoint is tested for cross-workspace reads and writes.
- **Safety:** rate limiting on auth endpoints, secure cookie settings, password hashing (ADR if non-default).
- **Email:** transactional email provider (ADR), behind an interface.
- **GDPR plumbing from the start:** export a user's data and delete an account. Building these in now is cheaper than retrofitting.

**Exit:** two workspaces exist side by side, and the isolation suite proves neither can read or change the other's data.

## M3: Deals

**Goal:** a creator can run a real deal from first contact to "live" in the app.

**Scope:**
- **Design note first:** `docs/design/deals.md`, covering the data model and stage rules.
- **Brands and contacts:** each contact has a role, `marketing` or `accounts payable`. Research shows creators already track these separately.
- **Deals:**
  - Pipeline stages: Lead → Negotiating → Contracted → In production → Live → Invoiced → Paid, plus Lost.
  - Board and list views.
  - Fields: source, platform, pay model (flat / affiliate / hybrid / gifted), fee and currency, payment terms (net N, counted from invoice or go-live), next action and its date.
- **Money:** integer minor units plus an ISO 4217 currency on every amount (ADR). No floats, and no FX conversion.
- **Deliverables:**
  - Fields: type (Reel, TikTok, YouTube integration, podcast read, newsletter placement, …), draft due, live due, status, live URL, revision rounds used vs allowed.
  - One flexible model, not a schema per platform.
- **Terms as dated records:**
  - Usage rights: organic or paid, channels, start and end or perpetual, territory.
  - Exclusivity: category, start, end.
  - Whitelisting or partnership ads: platform, start, end.
- **Contracts:**
  - File upload (storage ADR): private bucket, signed URLs, PDF and image types only, size limit.
  - No e-signing.
- **Activity and notes** per deal.
- **Today view:**
  - deliverables due in the next 7 days, and overdue ones
  - usage rights or exclusivity ending within 30 days
  - deals with no next action
- **Timezones:** dates stored in UTC and shown in the workspace timezone.

**Exit:** a real deal from the founder's niche, entered start to finish, takes under 3 minutes and shows up correctly in the Today view.

## M4: Invoicing + payments

**Goal:** get the creator paid, and let us get paid.

**Scope:**
- **Design note first:** `docs/design/invoicing.md`.
- **Invoice from a deal:**
  - Line items are prefilled from the fee and deliverables.
  - Business profile: the creator's legal name, address, tax ID as text, and free-form payment instructions (bank, Wise, Payoneer, PayPal).
  - Brand billing details, including PO number.
- **Invoice numbering:** sequential per workspace, safe under concurrent requests (ADR).
- **PDF generation** (ADR).
- **Invoice states:** draft, sent, partially paid, paid, overdue, void.
  - Due date comes from the net terms.
  - Overdue is computed by a scheduled job.
- **Recording payments from brands:** amount, date, method, and optionally the amount actually received after fees and FX.
  - **We record payments; we never move or hold money.**
- **Chasing:**
  - Follow-up email drafts at due, +7 and +14 days, which the creator copies or sends from their own email client.
  - Each brand keeps a record of how late it pays.
- **Background jobs:** Redis + BullMQ (ADR), for the overdue checks plus due-date reminders and a weekly digest email *to the creator*.
- **Earnings summary:** paid, outstanding and overdue, shown **per currency**.
- **Our own billing:**
  - Behind a `BillingProvider` interface, with an entitlements table driven by webhooks.
  - Plan limits enforced in the API.
  - Built against the **Paddle sandbox**.
  - Free plan: up to 3 active deals. Pro: $12 a month or $120 a year (brief §8).

**Exit:**
- A deal reaches Paid through invoice → sent → payment recorded.
- A sandbox subscription upgrades and downgrades the workspace's plan through webhooks alone.

## M5: Private beta

**Goal:** 10–20 real creators using it, safely.

**Scope:**
- **Onboarding:**
  - First-run setup: business profile, currency, timezone.
  - A guided first deal and a sample deal.
  - **CSV import** from a spreadsheet tracker. The template is the incumbent, so meet creators there.
- **Error tracking and monitoring:**
  - Error tracking on API and web (ADR).
  - Uptime check and alerting.
  - Product events for activation and retention (cookieless analytics, so no cookie banner needed).
- **Backups:**
  - Automated daily MySQL backups, retained off-host.
  - A **tested restore drill**, documented in `docs/runbooks/restore.md`.
- **Legal:**
  - Privacy policy and terms of service, from a generator and checked against what the product actually does.
  - A click-through DPA (data processing agreement) with Standard Contractual Clauses.
  - A public sub-processor list.
  - A breach-response runbook and a records-of-processing sheet.
- **Feedback channel:**
  - An in-app feedback button that writes to the DB and notifies the founder.
  - A private beta group chat.
  - A fortnightly call with each beta creator.
- **Production:**
  - Hosting (ADR), domain, HTTPS.
  - Email deliverability: SPF, DKIM, DMARC.
  - Secrets in the platform's secret store.
- **Security pass:** an OWASP Top 10 checklist on the codebase, dependency scanning in CI, and an upload-handling review (contracts arrive from strangers, and malware "contracts" are a known attack on creators).
- **Billing live:**
  - Apply for live approval with **Paddle and Creem at the same time**. Both need the live site, pricing, terms and privacy pages.
  - Confirm the tax treatment with a Bangladeshi tax practitioner before charging anyone.
  - Beta users get founding-member pricing.

**Exit:**
- At least 10 beta creators active in each of 3 consecutive weeks.
- The restore drill has passed once.
- Legal pages are live.
- Billing approval has been requested.

## After the beta (not scheduled)

These are in order of current evidence, re-ranked after the beta:
1. **Forward-to-app email intake**, which creates a draft deal from a forwarded brand email.
2. **Payment links on invoices**, only where the provider supports the creator's country.
3. **A manager role across multiple creator workspaces.**
4. **Brand payment-reputation insights**, aggregated and opt-in.
5. **More formats** in onboarding: podcast and newsletter presets.
