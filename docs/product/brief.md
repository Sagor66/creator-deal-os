# Product brief: Creator Deal OS

**Date:** 2026-10-04 · **Evidence base:** [research.md](research.md), desk research only. **No creator interviews yet**, so everything below is a hypothesis until the "Assumptions to validate" section is worked through.

## 1. Problem

**Brand deals are how most creators earn**, and they are run as small B2B contracts:
- About 70% of creator revenue comes from brand deals [research §8].
- Each deal is a contract with deliverables, deadlines, licensing terms, an invoice and 30–90+ day payment terms.

**Most creators run them alone, across scattered tools:**
- Only 1 in 4 creators has a manager.
- Deals live in inbox threads, DMs, brand portals, a spreadsheet or Notion template, a calendar, and an invoicing or payments app.

**Where that breaks** (evidence strength in brackets, research §6):
- **Getting paid** [moderate–strong]: 48–56% of creators report late payments, and some terms stretch to 90–120 days. Chasing is manual, and invoices stall on missing PO numbers, the wrong contact, or tax forms.
- **Usage rights and exclusivity** [moderate]: brands reuse content beyond what was agreed, 47% of creators report unauthorised use, and nobody tracks when rights expire or when a renewal should be charged.
- **Cross-border payments** [strong that routes are costly]: PayPal and Stripe don't reach some countries. Small transfers lose about 6.5% on average, and one Bangladeshi freelancer reports losing 40%. Non-US creators are an afterthought in US-built tools.
- **Scattered communication** [moderate]: offers arrive about equally by email and DM, and Instagram had to add a folder so brand messages weren't buried.
- **Missed deliverables** [anecdotal]: revision churn is documented. Forgetting deadlines is **not** documented and stays an assumption.

**Our belief:** creators juggle too many tools for simple business tasks. This has the **weakest** evidence (research §6.8). The real incumbent is a free spreadsheet or Notion template, and the product has to beat that, not beat other apps.

## 2. Target users

| Segment | Who | Why them | When |
|---|---|---|---|
| **Beachhead** | English-speaking **fitness/lifestyle creators**, roughly 10k–250k followers on IG, TikTok or YouTube, who **self-manage** and do **about 2+ paid deals a month**, anywhere in the world | The founder's niche and network, so we can reach them and understand them. Health & fitness is a top-4 brand category. 2+ deals a month is where a spreadsheet starts to break. | MVP |
| Adjacent | The same profile in any niche, and non-US creators paid in foreign currency | Same workflow; the cross-border pain is sharper | Beta → launch |
| Later | Podcasters and newsletter writers (CPM pricing, different deliverables) | The data model supports them; onboarding presets come later | Post-beta |
| Later | Managers and assistants running several creators | Workspaces already support members; a manager view comes later | Post-beta |
| **Not a target** | Nano creators doing only gifted deals; agencies; brands | Too little to manage, or a different product (brand-side platforms exist) | — |

**Why "2+ paid deals a month" and not "small creators":**
- Most creators do 0–10 sponsored posts a *year*, and 6 in 10 offers are gifting [research §4, §6.10].
- A creator with one deal a quarter doesn't need software.
- The pain scales with **concurrent** deals, so the beachhead is defined by deal volume, not follower count.

## 3. The workflow we're supporting

1. Contact → 2. Qualify → 3. Negotiate → 4. Contract → 5. Brief and produce → 6. Approval → 7. Go live → 8. Report → 9. Invoice → 10. Get paid → 11. Rights and exclusivity run out; renewal.

Typical length: 2–4 months from first contact to cash [research §1]. Stages 9–11 are where money is lost, and the tools we found are weakest there.

## 4. Current workarounds

| Workaround | What it does well | Where it breaks |
|---|---|---|
| Spreadsheet or Notion template (**the incumbent**) | Free, flexible, already familiar | No reminders; no invoice; rights expiry and overdue payments must be spotted by eye; breaks as deals overlap |
| Inbox + DMs + calendar | Where deals actually happen | Terms scattered across threads; nothing is computed |
| Generic freelancer CRM (HoneyBook, Dubsado, Bonsai; $25–109 a month) | Proposals, contracts, invoices | No deliverable types, usage rights or exclusivity; priced for service businesses |
| Link-in-bio suites (Beacons, Passionfroot) | Media kit, storefront, some invoicing | Built around getting deals and taking payment, not running them afterwards. Some hold funds, and trust issues are reported. |
| Invoicing apps, PayPal, Wise | Getting paid | Not tied to the deal; PayPal is unavailable or costly in some countries |
| Brand-side portals (Aspire, GRIN, TikTok One, …) | Smooth inside one portal | Each holds only its own slice, so the creator's records fragment |

## 5. Competitors and our positioning

**The field is crowded and has no traction:**
- At least 15 creator deal CRMs launched in 2025–26 (Paperclip, Vigl, Fandesk, Tango, Manage Deals, …) [research §7.3].
- They are near-identical: pipeline, deliverables, invoice, reminders, AI contract review, $10–20 a month.
- None shows real traction.
- **Features are not a moat.** We assume anything we build can be copied in weeks.

**Positioning (hypothesis):**
> The back office for your brand deals: every deal, deliverable, usage right and payment in one place, built for creators anywhere in the world. We never touch your money.

**Where we aim to be different, ordered by evidence:**
1. **Payment readiness, not just reminders.** Track what a brand needs before it will pay: the accounts-payable contact, PO number, tax form (W-9 or W-8BEN), and when net terms actually start. Record each brand's payment history. Research §7.6 found no tool doing this.
2. **Usage rights and exclusivity as dated records.** Alert before they expire, and treat expiry as a prompt to charge for renewal. Only 2 small competitors mention it.
3. **Global by default.** A currency on every deal, free-form payment instructions (Wise, Payoneer, local bank) and no reliance on Stripe or PayPal reaching the creator. Built by a founder in a country those tools don't serve.
4. **We never hold funds.** That is a trust position, given complaints about money held by tools that do [research §7.6].
5. **Distribution:** the founder is a creator in the niche and has a channel. This is the only advantage that can't be copied in weeks, and it is also unproven (A8).

## 6. MVP features

The MVP is scoped to roadmap M2–M5. Each feature traces to a problem in §1.

| Feature | Problem it addresses |
|---|---|
| **Workspace + auth**, with members (owner and member) | Foundation. Lets an assistant or manager help later. |
| **Brands and contacts**, with each contact marked marketing or accounts payable | Invoices go to the wrong person |
| **Deal pipeline:** Lead → Negotiating → Contracted → In production → Live → Invoiced → Paid / Lost. Board and list. | Deals scattered across inbox and DMs |
| **Deal terms:** fee and currency, pay model (flat / affiliate / hybrid / gifted), net terms and what they count from | Late payment, cross-border |
| **Deliverables:** type, draft and live due dates, status, revision rounds used vs allowed, live URL | Missed deliverables, revision churn |
| **Usage rights, exclusivity and whitelisting** as dated records | Unauthorised reuse; uncharged renewals |
| **Contract upload** (PDF or image, private) | One place for the paperwork |
| **Today view:** due this week, overdue, rights or exclusivity expiring in 30 days, deals with no next action | Everything is spotted by eye today |
| **Invoice from a deal:** numbering, the creator's payment instructions, brand PO number, PDF, net terms set the due date | Messy invoices |
| **Payment tracking:** record payments (including partial and amount received after fees), overdue status, follow-up email drafts at due, +7 and +14 days, per-brand lateness history | Late payment, chasing |
| **Reminders and a weekly digest** emailed to the creator | Forgotten dates; brings users back |
| **Earnings per currency:** paid, outstanding, overdue | Multi-currency reality |
| **CSV import** from a spreadsheet tracker, plus guided onboarding | The incumbent is a spreadsheet; moving off it must be cheap |
| **Our subscription billing** through a merchant of record, with plan limits | Paying users are a success metric (§9) |

## 7. Non-goals (MVP)

**Money and payments:**
- **Holding, moving or processing brand payments.** No escrow and no pay button on invoices. This avoids money-transmission licensing and is part of the trust position.

**Finding deals:**
- **A marketplace, brand database or deal sourcing.** That is a different product. A shared brand directory would also make us a GDPR controller for brand staff data.

**Integrations and automation:**
- **Inbox or DM integration** (Gmail sync, IG DMs). It's high value but needs a heavy trust and security review and OAuth verification. Forward-to-app intake comes first, after beta.
- **Analytics imported from IG, TikTok or YouTube.** Creators paste a link and a screenshot.
- **Automated emails sent to brands on the creator's behalf.** Drafts only; the creator sends from their own inbox.
- **AI features:** contract review, pricing suggestions, email parsing.

**Contracts, tax and pricing advice:**
- **Contract generation, e-signing, AI contract review, legal advice.**
- **Tax calculation or filing, accounting, FX conversion, country-specific tax invoices.** Invoices are plain commercial invoices; tax fields are free text.
- **Media kit and rate calculator.** Beacons and others already do this well.

**Audience, platforms and language:**
- **Brand-side or agency features.**
- **Native mobile apps.** The web app is responsive.
- **Localised UI.** English only. Currencies, dates and timezones are global from day one.

## 8. Pricing, billing and company setup

**Decided 2026-10-04.** Pricing is still a hypothesis that A6 tests. Billing provider and company setup are operating decisions, reviewed at the triggers listed below. Evidence: research §9–10.

### Pricing hypothesis

| Plan | Price | Limits |
|---|---|---|
| **Free** | $0 | Up to **3 active deals** (anything not Paid or Lost), all features |
| **Pro** | **$12 a month or $120 a year** | Unlimited |
| Founding member (beta) | Free during beta, then **50% off the first year** | Unlimited |

**Why these numbers:**
- **The limit tracks the pain.** The pain grows with *concurrent* deals, so a creator with an occasional deal stays free and becomes word of mouth. The creator juggling several pays.
- **$12 matches the market.** Comparable tools charge $10–20 a month, and HoneyBook and Dubsado charge $25+ for generic features.
- **The value case:** at a ~$350 average deal, one recovered late payment or one charged usage-rights renewal pays for the year.
- **Annual is pushed for a reason.** The billing provider's fixed 50¢ is 9.2% of a $12 monthly charge but 5.4% of an annual one.
- **Not yet:**
  - Prices adjusted by country (our provider supports localised prices). Comes only after the base price is tested, since the beachhead earns enough from deals for $12 to be about 2% of one deal.
  - A manager or team tier, after the beta (R1 fallback).

### How we charge: merchant of record
- **Primary: Paddle** (5% + 50¢, all-in).
  - It is the legal seller and handles VAT, GST and sales tax worldwide.
  - It accepts Bangladesh-based individuals and pays out by wire or Payoneer.
- **Fallback: Creem** (3.9% + 40¢). We apply to it at the same time in M5, because approval is never guaranteed (R6).
- **Not chosen:**
  - **Stripe direct:** unavailable to Bangladesh residents, and it would leave us registering and filing VAT ourselves.
  - **Dodo:** closed to new Bangladesh sellers since 2026-03-23.
  - **Lemon Squeezy:** winding down.
  - **Polar:** Bangladesh payouts depend on an unverified Stripe Connect path.
- **Keeping the exit open.** Our code depends on a `BillingProvider` interface plus our own entitlements table, updated by webhooks. Switching providers (e.g. to Stripe once a company exists) is a contained change. The interface goes in M4 with an ADR.

### Company setup: none yet
- **Sell as an individual** through the merchant of record.
- **Take payouts into a Bangladeshi bank,** ideally a foreign-currency (ERQ) account, so the money is documented as IT-services export income.
- **Claim the IT-services tax exemption**, which runs to 30 Jun 2027.
- **Why not a US LLC now:**
  - $400–1,500 a year in fixed cost.
  - A $25k penalty risk on the annual IRS Form 5472.
  - Mercury blocks Bangladesh residents.
  - Bangladesh Bank requires annual audited accounts for a foreign entity.
  - It becomes awkward under German tax after a move.
- **Revisit when any of these happens:**
  1. Paddle and Creem both reject us.
  2. Revenue reaches roughly $5–10k a month, where Stripe direct saves real money.
  3. The founder moves to Germany. Then register as a freelancer or sole trader, and later a UG.
- **Before charging the first customer:** get a Bangladeshi tax practitioner to confirm that merchant-of-record payouts qualify for the exemption.

## 9. Go-to-market

| Phase | When | Channel | Goal |
|---|---|---|---|
| 0. Validate | During M1–M3 | Founder's DMs and network | 10–15 interviews, 3+ real trackers collected (assumptions A1–A5) |
| 0. Build in public | M1 onward | Founder's channel: short devlog episodes on building it, and on what creators learn about brand deals | A waitlist of 50+ creators before beta |
| 1. Private beta | M5 | Hand-picked from the waitlist and network; **concierge onboarding** (we import their spreadsheet with them) | 10–20 weekly-active creators; founding-member offer |
| 2. Content-led | Post-beta | Free tools that rank and get shared: invoice template, usage-rights pricing guide, "what net-30 really means" guide, a free tracker template that links to the app | Self-serve sign-ups beyond the network |
| 3. Global | After retention is proven | English SEO, creator educators and managers as partners, communities, referral (a free month each), Product Hunt | Sign-ups beyond the fitness niche and beyond the founder's region |

**Rule:** don't pay for acquisition until retention (§10) is proven. Paid ads don't fix a product creators don't come back to.

## 10. Success metrics

**Definitions:**
- **Activated:** within 7 days of sign-up, a workspace has **2+ deals, with at least one deliverable that has a due date or one invoice**. Two deals rules out a one-deal test drive.
- **Retained:** an activated workspace **updates a deal, deliverable or invoice in week 4 and week 8**. Deals are low-frequency, so "logged in" isn't enough; the creator has to do something.
- **Paying:** an active paid subscription after any trial or founding period.

| Metric | Private beta target | First 3 months after billing is live |
|---|---|---|
| Interviews done before M4 | 10+ | — |
| Beta creators weekly-active for 3 consecutive weeks | 10+ | — |
| Activation rate (of sign-ups) | ≥ 60% (hand-onboarded) | ≥ 35% (self-serve) |
| Week-4 retention (of activated) | ≥ 50% | ≥ 40% |
| Week-8 retention (of activated) | ≥ 40% | ≥ 30% |
| Paying users | ≥ 30% of active beta creators take the founding offer | 25+ paying workspaces; free → paid ≥ 5% of activated |
| Value signal | ≥ 1 creator reports an invoice paid or a renewal charged *because of* a reminder | Invoices marked paid each month keeps rising |

**These are guesses to beat, not benchmarks.** They get revised after the first beta cohort.

## 11. Risks

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R1 | **Too few deals.** Creators in the beachhead do too few paid deals for a spreadsheet to hurt | **High**: the strongest counter-evidence in research §6.10 | Define the beachhead by deal volume (A1); move upmarket to managers if interviews say so |
| R2 | **Commodity.** Dozens of near-identical trackers; any feature can be copied | High | Compete on focus (payment readiness, rights), global reach, trust and distribution, not on feature count |
| R3 | **Founder has never done a brand deal** | Certain | Interviews before M4; a talent-manager advisor; concierge onboarding; the brief stays a hypothesis |
| R4 | **Manual entry kills adoption** (records live in inboxes and portals) | Medium–high | Fast quick-add, CSV import, sensible defaults; forward-to-app email intake post-beta |
| R5 | **Low willingness to pay** at small-creator incomes, globally | Medium–high | Price against one recovered payment; annual plans; test the price before building billing UI (A6) |
| R6 | **Billing provider rejects a Bangladesh individual seller** | Medium | Apply to the primary and a fallback in parallel during M5; keep billing behind an interface |
| R7 | **A breach of contracts or finances** ends trust permanently | Low–medium, high impact | Tenant-isolation test suite (M2); private storage with signed URLs; backups with restore drills; upload restrictions |
| R8 | **Compliance burden:** GDPR representatives, DPA, Bangladesh PDPA data-residency rules | Medium | Legal checklist in research §11; generator now, lawyer before paid launch |
| R9 | **Malware "contracts"** uploaded as attachments | Medium | PDF and image only, size limits, private storage, no server-side rendering of untrusted files in the MVP |
| R10 | **Solo-founder scope creep** delays the beta | High | Non-goals in §7; milestone exit checks; the M4 decision gate |

## 12. Assumptions to validate

**Order matters:** A1–A5 decide whether to build M3–M4 as scoped, so they're tested first, in interviews during M1–M3.

| # | Assumption | Evidence today | How to test | What changes our mind |
|---|---|---|---|---|
| A1 | Beachhead creators do **2+ paid deals a month** | Weak: most creators do 0–10 sponsored posts a year | Interviews: "walk me through every deal from the last 90 days" | Median under 1 a month → move the beachhead to managers or bigger creators |
| A2 | **Late or problem payments** happen to *them*, not just to big creators | Moderate (vendor surveys) | "Tell me about the last time a brand paid late or not at all" | Fewer than half have a story from the last 6 months → payments stop being the headline |
| A3 | Their current tracker **hurts** enough to switch | Weak | Ask to see it; count the tools they use; ask what they missed last month | Their tracker works and they missed nothing → we're a nice-to-have; rethink |
| A4 | They **know** their usage-rights and exclusivity end dates, or care to | Moderate on misuse; unknown on whether they care | Ask about their last contract's rights clause | Nobody knows or cares → move rights tracking down the list |
| A5 | **Cross-border pay** is a real pain for a meaningful share of the beachhead | Strong that it's costly; unknown for this segment | Count non-home-currency deals in interviews and in beta data | Few cross-border deals → keep multi-currency but stop leading with it |
| A6 | They will **pay about the proposed price** | None | Founding-member pre-sale during beta; a price question in interviews | Under 20% of engaged beta creators pay → test a lower price or a manager tier |
| A7 | Creators will **enter deals by hand** if it's fast | None | Time to first deal; deals per active user per month in the beta | Users stop after 1–2 deals → bring email intake forward |
| A8 | The **founder's channel and network** can fill a 20-person beta | None | One devlog post and a waitlist link; count sign-ups | Under 50 waitlist sign-ups → a different distribution plan is needed before M5 |
| A9 | **Fitness/lifestyle** generalises to other niches and formats | Plausible (same lifecycle, research §3) | Beta users from 1–2 adjacent niches | Workflows diverge → stay niche longer |
| A10 | Creators **trust a new tool** with contracts and earnings | Unknown | Ask in interviews; watch whether beta users upload contracts | Low upload rate → reconsider the trust messaging or a lighter "terms only" mode |
| A11 | **Paddle or Creem approves** a Bangladesh-based individual seller | Docs say yes; no first-hand reports | Apply to both as soon as the legal pages are live (M5) | Both reject → form a company earlier (§8) |
