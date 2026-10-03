# ADR-000: Subscription billing provider

- **Status:** Accepted
- **Date:** 2026-10-04
- **Decided by:** founder
- **Supersedes:** the earlier choice of Paddle in the first draft of the product brief
- **Related:** [brief §8](../product/brief.md), [research §9–10](../product/research.md), [roadmap M4 and "Pre-launch requirements"](../roadmap.md)

## Context

We need to charge creators worldwide for a subscription: Free, then Pro at $12 a month or $120 a year.

**This ADR is only about how *we* get paid.** Brand-to-creator payments are out of MVP scope: invoices carry the creator's own payment details, and we track status and chase.

**Constraints:**
1. **The founder lives in Bangladesh, which Stripe doesn't support as an account country.** A plan to move to Germany exists. Going live on Stripe needs a company in a supported country:
   - a US LLC (e.g. through Stripe Atlas), or
   - a German UG or GmbH after the move.
2. **Customers are global.** Selling digital services to consumers creates VAT, GST and sales-tax obligations:
   - EU and UK from the first sale
   - India, Korea, Mexico and others also from the first sale
   - the US, Australia and Canada past thresholds (research §9.4)
3. **Solo developer.** Billing code must be small, well-documented and testable without real money.
4. **Portfolio project for senior roles.** The integration should be one an interviewer recognises and can probe.
5. **No real revenue until the private beta ends.** We have time to set up a company before the first charge, but not unlimited time.

**Two models exist:**
- **Payment processor (Stripe):** we are the legal seller. Stripe moves the money and Stripe Tax calculates tax, but we register, file and carry the liability.
- **Merchant of record (Paddle, Polar):** the provider is the legal seller and handles global tax, for a higher fee and less control.

## Options

| | **Stripe Billing + Stripe Tax** | **Paddle** | **Polar** |
|---|---|---|---|
| Model | Processor; we're the seller | Merchant of record | Merchant of record (built on Stripe) |
| Fees on $12/mo | ≈ 6.6% on a US card; ≈ 9.1% on an international card with conversion; plus registration and filing costs | 5% + 50¢ ≈ 9.2%, all-in | 5% + 50¢, +1.5% non-US cards, +0.5% subscriptions, $15 per dispute; ≈ 9.7% (US card) to 11.2% (non-US card), plus payout fees |
| Global tax | **Ours.** Stripe Tax calculates, collects, validates tax IDs and monitors thresholds. Registration help and filing cost extra (Tax Complete $90/mo, partners). | **Paddle's** | **Polar's** |
| Available to us now | **Test mode only.** Live needs a US or German company. | Yes, as an individual, no company (docs; no first-hand reports) | Listed for Bangladesh, but individual payouts depend on Stripe Connect Express support there, which is unverified |
| Developer experience | Best in class: test clocks, CLI webhook forwarding, hosted Checkout and Customer Portal, typed SDKs, very large ecosystem | Good API, smaller ecosystem | Developer-focused, young, smaller ecosystem |
| Checkout and customer relationship | Ours, in our brand; full control | Paddle is the seller and appears on receipts | Polar is the seller |
| Exit to an MoR later | Stripe Managed Payments (+3.5%; US and German companies eligible), without leaving Stripe | n/a | n/a |
| Main risk | Company setup before launch (R6); tax registration and filing burden (R11) | Approval uncertainty; less control | Payout path for Bangladesh unverified; younger company |

## Decision

**Use Stripe Billing with Stripe Tax, behind a `BillingProvider` interface.**

**What we build** (roadmap M4):
- **Build and test in Stripe test mode now.**
- **Use Stripe Checkout and the Customer Portal**, not custom payment forms.
- **Enable automatic tax with Stripe Tax:**
  - collect the customer's billing address
  - collect an optional VAT or GST ID, so business customers get reverse charge
- **Webhooks update our own entitlements table.** They are signature-verified and processed idempotently by event ID. The app reads entitlements and never asks Stripe "is this workspace Pro?" during a request.

**Before going live** (roadmap "Pre-launch requirements"):
- **Register a company in a Stripe-supported country.** Choose at the start of M5, by the move date (research §10.3).
- **Register for EU and UK tax before the first sale.**
- **Monitor all other jurisdictions** against their thresholds.

**Fallback: Paddle.** We keep it documented because it is the only strong option that needs no company.

**Why Stripe, given that it isn't cheaper at our price:**
- **Developer experience and correctness.** Test clocks let us test renewals, failed payments and cancellations deterministically. That matters more to a solo developer than ~1% in fees.
- **Ecosystem and documentation.** Answers exist for nearly every edge case. It is also the integration most hiring teams will recognise.
- **Control** over checkout, receipts and the customer relationship.
- **A path to an MoR without migrating:** Stripe Managed Payments.

## Consequences

**Positive:**
- **No company is needed to build** the billing integration. M4 isn't blocked.
- **Billing is testable end to end** in CI and locally with the Stripe CLI and test clocks.
- **One provider for checkout, invoices, the portal and tax calculation.**
- **The `BillingProvider` interface and our entitlements table** keep Stripe types out of the domain. Plan limits are enforced from our DB.

**Negative, and accepted:**
- **Live billing is blocked until a company exists** (R6).
  - A US LLC adds about $400–1,500 a year, the annual Form 5472 ($25k penalty if missed), Bangladesh Bank foreign-entity reporting, and a hard-to-solve US bank account (Mercury and Wise exclude Bangladesh residents; Relay is the documented option).
  - A German company depends on the move date.
- **We are the legal seller everywhere we sell** (R11).
  - Registration and filing (EU OSS, UK VAT, then thresholds) are our job, and our liability if wrong.
  - Stripe Tax applies reverse charge on a tax ID's format even when the government check fails, so unverified IDs need handling.
  - Zero-threshold markets are a documented risk we carry.
- **Fees aren't lower than Paddle's** for international customers at $12/month. Annual plans soften this.
- **Managed Payments doesn't move existing subscriptions.** If we switch to it later, only new subscriptions move automatically; existing subscribers must re-subscribe through Checkout or stay on Billing.

**Engineering rules that follow:**
- **Stripe never leaks past the adapter.** Stripe IDs are stored as opaque external references.
- **Every webhook handler is idempotent** and tolerates out-of-order events. It re-fetches the subscription rather than trusting event order.
- **Money and currency are stored as integer minor units + ISO 4217** (ADR on money, M3).

## When we'd switch

**Switch to Paddle** (the documented fallback) if any of these happen:
- No company in a Stripe-supported country can be ready by the planned paid launch: Atlas or US banking fails for a Bangladesh resident, and the move to Germany is too far away.
- The cost of registration and filing (partners, an accountant, Tax Complete) passes about 3% of revenue for two consecutive quarters, with no Stripe Managed Payments option available.

**Switch to Stripe Managed Payments** (staying on Stripe) once a US or German company exists, if:
- we start selling meaningfully in zero-threshold or high-burden markets (India, Korea, Mexico, Switzerland), or
- filing work takes more than a few hours a month.

New subscriptions would go through Checkout with Managed Payments. Existing ones stay on Billing.

**Revisit Polar or another MoR** only if its Bangladesh payout path is verified *and* a company still can't be formed.

**Cost of switching:**
- One new `BillingProvider` adapter.
- A webhook mapping.
- A customer migration, because card details live at the provider: customers re-enter cards or move at renewal.
- Our entitlements, plans and limits don't change.
