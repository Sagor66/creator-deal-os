# Creator Deal OS

Multi-tenant SaaS for content creators to manage brand deals end to end:
deal pipeline, contracts, deliverables, invoicing, payment chasing, renewals.
Portfolio project: the repo must show planning → decisions → execution.

## About me

Solo founder-engineer building a global product for creators worldwide.
I'm currently based in Bangladesh (likely relocating to Germany), which
only matters for company registration and payment-provider eligibility —
never for the product, its market, or its users.
Stack experience: NestJS, Next.js, MySQL, multi-tenant SaaS. Small
fitness/lifestyle creator; I have never done a brand deal myself. I must
deeply understand every decision, because I will maintain this product and
defend it in senior engineering interviews.

## Product principles

- Decided: ORM is Drizzle (MySQL). Subscription billing via Stripe
  (test mode until a company is registered in a Stripe-supported
  country), behind a BillingProvider interface so the provider can be
  swapped later. Use Stripe Tax for tax calculation. The MVP does NOT
  process brand-to-creator payments: invoices carry the creator's own
  payment details and we track status and chase.

## Stack

- pnpm workspaces + Turborepo
- apps/api: NestJS, TypeScript strict
- apps/web: Next.js App Router, Tailwind, shadcn/ui, TanStack Query
- packages/schemas: shared zod schemas; packages/config: shared tsconfig/eslint
- MySQL 8 (InnoDB); ORM chosen in ADR-002
- Redis + BullMQ later

## Working rules (always follow)

1. Never commit to main (except initial setup). Every task: new branch →
   commits → PR via gh. Never merge PRs yourself; I merge after review.
2. Conventional Commits. Small, focused commits.
3. Every PR uses .github/pull_request_template.md and fills in: What, Why
   (link issue/ADR), Trade-offs and rejected alternatives, How tested, Evidence.
4. Before any non-trivial feature, write a short design note in
   docs/design/, then proceed.
5. When a choice between real options comes up, make the best decision for
   this project yourself (multi-tenant SaaS, MySQL, solo dev, portfolio for
   senior roles). Record it as an ADR in docs/adr/NNN-title.md (Context,
   Options, Decision, Consequences). Prefer boring, widely-used, defensible
   choices.
6. No feature is done without tests. Prefer real MySQL via Testcontainers
   for repository tests.
7. Never hardcode secrets. All config via zod-validated env.
8. Explain non-obvious code briefly in the PR, not in noisy comments.
9. When finishing a task, tell me: what you did, what I should review
   closely, and what you were unsure about.
10. After every task, write a learning explainer in .notes/NNN-topic.md
    (next number in sequence) with:
    - What we built (plain language, 3–5 lines)
    - How it works (walk through the key files, with paths)
    - Decisions made and why
    - Alternatives rejected and why
    - When this decision would be WRONG
    - Concepts to understand (simple explanation + small example each)
    - Interview questions: 5 likely questions + strong model answers
      - the follow-up an interviewer would ask next
    - Explain-it-back check: 3 questions I should answer without looking
11. Explainers are for my understanding: concrete, use this project's code
    as examples, no filler. Assume I'm smart but new to the topic.

## Docs layout

docs/product/brief.md · docs/roadmap.md · docs/architecture.md ·
docs/adr/ · docs/design/ · docs/devlog/YYYY-MM-DD.md · docs/runbooks/
