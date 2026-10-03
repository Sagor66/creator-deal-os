# Research: how creators run brand deals, and what it takes to sell to them globally

**Date:** 2026-10-03 · **Method:** desk research only (web search). No creator interviews yet.

## How to read this

- **What this is:** secondary research. **No creator interviews have been done yet.** Section "Assumptions to validate" in [brief.md](brief.md) lists what interviews must confirm.
- **Every claim carries a source label:**

| Label | Meaning |
|---|---|
| `[data]` | Platform, government or independent statistics |
| `[survey·vendor]` | A survey run by a company that sells a fix for the problem it measures. Real data, with an incentive to find pain. |
| `[survey·agency]` | A survey run by an agency |
| `[journalism]` | Reporting by trade or general press |
| `[practitioner]` | Talent managers, lawyers, agencies writing from experience |
| `[docs]` | Official product or regulator documentation |
| `[vendor marketing]` | Claims on a seller's own site |
| `[anecdote]` | A single person's story |

- **Reddit and some forums were blocked** for the research tools, so first-hand forum evidence is thin.
- **Numbers left out:** several widely repeated figures ("87% of creators paid late", "creators use 5.2 tools", "$4.8B sponsorship scams") had no traceable primary source.

---

## 1. The brand-deal lifecycle, pitch to payment

How a typical paid deal runs for a creator, with practitioner timing for a YouTube integration [practitioner, talent agency, Mar 2026](https://creatorsagency.co/blog/youtube-brand-deal-timeline-pitch-to-payment):

| # | Stage | What happens | Typical time | What goes wrong |
|---|---|---|---|---|
| 1 | **Contact** | The brand reaches out (email, DM, marketplace) or the creator pitches. | — | The offer gets buried in a DM or inbox, or it's a scam. |
| 2 | **Qualify** | Creator checks: is the brand real, a fit, and is it paid or gifted? | days | Fake brands, malware "contracts" (§6.6) |
| 3 | **Negotiate** | Fee, deliverables, usage rights, exclusivity, payment terms. | 7–21 days, together with stage 4 | Underpricing (§6.7); giving away usage rights for free |
| 4 | **Contract** | Written agreement or statement of work (SOW), or just an email thread for small deals. | 7–21 days, together with stage 3 | Perpetual rights or long exclusivity buried in the contract |
| 5 | **Brief and production** | Brand sends a brief; creator drafts a script or concept. | 14–28 days | Unclear brief |
| 6 | **Approval** | Brand reviews drafts and requests revisions. | Brands promise 48h, actually take 5–7 business days, 10+ with legal | Excessive revision rounds |
| 7 | **Go live** | Creator posts on the agreed date, with disclosure and tags, and sometimes a Spark code or partnership-ad permission. | — | Missed date, missing disclosure |
| 8 | **Report** | Creator sends screenshots or insights after the tracking window. | 14–30 days after go-live | Brand holds payment waiting for the report |
| 9 | **Invoice** | Creator sends an invoice with net terms. Big brands may require vendor onboarding (W-9 or W-8BEN, a portal, a PO number). | — | Invoice missing a PO or the right contact, so the brand's accounts-payable (AP) team never processes it |
| 10 | **Get paid** | Bank transfer, PayPal, or a platform payout. | 30–90 days after go-live; 120+ happens | Late payment, chasing, FX and wire fees |
| 11 | **After the deal** | Usage-rights and exclusivity windows run out; renewal or repeat deal. | weeks–months | Brand keeps running ads after rights expire; renewal not priced |

**Key facts:**
- **Net-30 is still the most common term**, but practitioners report 45/60/90/120-day terms spreading. Contracts should say whether net-30 runs "from go-live" or "from end of tracking window" [journalism, Digiday, Jan 2026](https://digiday.com/future-of-tv/future-of-tv-briefing-the-creators-economys-very-loud-dirty-little-secret-of-brands-late-delayed-payments/).
- **Repeat business is rare.** Only 7.9% of creators always convert one-off deals into repeat work [survey·vendor, AIC/HypeAuditor, n=567, 2024](https://www.netinfluencer.com/aic-canopy-for-creators-hypeauditor-brand-partnerships-report/). 42% mostly do one-offs; 12% mostly long-term [survey·vendor, CreatorIQ, n=5,095, Aug 2026](https://www.tubefilter.com/2026/08/16/creators-rely-on-brand-deals-but-worry-about-the-tension-between-sponsors-and-viewers-and-just-15-say-they-fully-trust-sponsored-content-from-other-creators/amp/).
- **Small deals skip stages:**
  - **Gifting rarely gets a contract.** 35% of marketers use no contract for gifting, and 41% use something informal [survey·vendor, Modash, n=31](https://www.modash.io/blog/influencer-contracts).
  - **Marketplace deals skip the invoice.** Aspire triggers PayPal payment when deliverables are approved [docs](https://help.aspireiq.com/en/articles/6326989-how-do-payments-work-on-aspire).
  - **Gifted posts still need an ad disclosure** [docs, FTC](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers).

## 2. Key terms

**Pricing add-ons**
- **Usage rights:** the brand's licence to reuse the creator's content, scoped by channel (organic vs paid), duration and sometimes territory. Typical add-on pricing: +20–50% of base fee, +50–100% for perpetuity, or 20–30% a month. Paid usage is sold in 4-, 13- or 52-week cycles [practitioner roundup, Aug 2026](https://www.netinfluencer.com/perpetuity-whitelisting-ai-clauses-23-creator-economy-experts-on-what-brands-get-wrong-about-creator-usage-rights/).
- **Whitelisting / allowlisting / creator licensing:** the brand runs paid ads *from the creator's handle*.
  - TikTok calls these **Spark Ads**. Authorisation codes expire, and the ads stop when they do [docs](https://ads.tiktok.com/help/article/spark-ads).
  - Meta calls them **partnership ads**. With account-level permission, the brand can create ads without an existing post [docs](https://developers.facebook.com/docs/marketing-api/ad-creative/partnership-ads/account-level-permissioning).
- **Exclusivity:** the creator can't work with competitors in a category for a window, often 30–60 days. It is priced separately [practitioner](https://creatorsagency.co/blog/how-to-price-youtube-integration-vs-dedicated-video).

**Deal structure**
- **Deliverables:** the concrete pieces owed, for example "1 Reel + 3 Stories, draft due 12 Mar, live 15 Mar".
- **Approval rounds:** how many revision rounds the brand gets. State it in writing.
- **Pay models:** flat fee, affiliate/commission, hybrid (base + commission), or gifted (product only). 61% of marketers used some performance-based pay in 2025 [survey·vendor, Modash, n=50+](https://www.modash.io/de/blog/survey-influencer-trends-contracts-negotiation-pricing).
- **Kill fee:** what the brand owes if it cancels without cause [practitioner, law firm, 2024](https://revisionlegal.com/internet-law/influencer-contracts-kill-fees-explained/).
- **Net terms:** days from invoice (or go-live) until payment is due.

## 3. How deals differ by format

| Format | Typical deliverable | Pricing basis | Reporting |
|---|---|---|---|
| YouTube | Integration (a 30–90s segment) or dedicated video (2–4× the price) | CPM × average views of the last 10–15 videos [practitioner](https://creatorsagency.co/blog/how-to-price-youtube-integration-vs-dedicated-video) | Views, CTR on a tracking link |
| Short-form (TikTok, Reels, Shorts) | Video or package, plus Spark code or partnership-ad permission | Per video or package, plus usage and whitelisting add-ons | Screenshots of insights |
| Podcast | Host-read ad, about 60s pre-roll or mid-roll | CPM on downloads, e.g. a $21.95 average on Libsyn Ads in Mar 2024 [survey·vendor](https://rainnews.com/libsyn-ads-podcast-ad-rates-march-2024). Dynamically inserted ads are over 90% of revenue [data, IAB 2023](https://www.iab.com/news/brand-building-now-accounts-for-61-percent-of-podcast-advertising). | Downloads, promo code |
| Newsletter | Primary, classified or dedicated-send placement | CPM per 1,000 subscribers, or CPC or flat [vendor marketing, Feb 2026](https://blog.tryletterhead.com/blog/monetize-newsletter-sponsorships-guide) | Opens, CTR, UTM or code conversions |

**Product implication:** the core objects are the same in every format (brand, deal, deliverables, terms, invoice). What varies is the deliverable type, the pricing basis and the reporting metrics. **A deliverable needs a format/type field with flexible metrics, not a schema per platform.**

## 4. Small creators (5k–100k followers)

- **Volume is low:**
  - 53% of creators made 0–10 sponsored posts in a year, and 23.9% made 10–20 [survey·vendor, Influencer Marketing Hub, 3,000+ creators, 2025](https://influencermarketinghub.com/creator-earnings-report-2025/).
  - 46.4% say they would *need* 2–4 deals a month to be sustainable [survey·vendor, AIC 2024, link in §1].
- **Deals are small:**
  - Marketplace average fees: TikTok $350, Instagram $364, YouTube $675, UGC $198 [survey·vendor, Collabstr data, 15k+ collabs, Feb 2025](https://www.netinfluencer.com/influencer-collab-costs-in-decline-but-ugc-offers-bright-spot-in-2025-report-finds/).
  - About 80% of deals on Collabstr are under $300 [data, 2026](https://storyboard18.com/how-it-works/80-influencer-deals-under-300-brands-shift-to-ugc-report-92782.htm).
- **Most negotiate alone.** Only 1 in 4 creators has formal management [survey·vendor, IMH 2025]. Agencies take 10–25% of the creator's fee [practitioner](https://creatorsagency.co/blog/youtube-talent-agency-commission-rates-explained).
- **Deals come through marketplaces as well as directly.** 54.5% of creators find deals mainly through platform marketplaces [survey·vendor, AIC 2024]. That means part of a creator's deal history lives inside brand-side portals (§7.4).

## 5. Regional differences (global from day one)

| Region | What's different | Source |
|---|---|---|
| **India** | Agency-heavy. 55% of creators lost deals because brands reached them through unverified middlemen. Barter deals and late pay are common. Brands withhold 10% tax (TDS) on gifted products the creator keeps, above ₹20k/yr. | [journalism, Feb 2026](https://www.storyboard18.com/amp/agency-news/monk-e-to-chtrbox-agencies-powering-indias-influencer-marketing-surge-90385.htm); [survey·vendor, n=32k, 2025](https://www.storyboard18.com/brand-marketing/55-creators-lost-brand-deals-due-to-unclear-and-unverified-way-for-brands-to-contact-them-hashfame-67632.htm); [anecdote, Aug 2026](https://thenodmag.com/newsletters/weekend/issue-339-indias-creator-influencer-economy-problems); [practitioner, 2022](https://www.barandbench.com/view-point/overview-of-the-guidelines-for-tax-deduction-on-benefit-or-perquisite) |
| **France** | Since 1 Jan 2026, a written contract is mandatory for any collaboration over €1,000 excl. tax, cash or in-kind. | [vendor marketing summarising the decree](https://www.kolsquare.com/fr/blog/la-france-publie-un-nouveau-decret-definissant-les-contrats-obligatoires-pour-les-partenariats-avec-les-influenceurs) |
| **Brazil** | Payment terms of 30–120 days were traditional. | [vendor marketing, 2025](https://www.abcdacomunicacao.com.br/brandlovers-cria-a-primeira-solucao-em-larga-escala-que-automatiza-contratos-e-pagamentos-entre-marcas-e-criadores-de-conteudo/) |
| **Southeast Asia** | Commerce-first: affiliate links and "Key Opinion Sellers" (creators focused on direct selling). Creators accuse the platform Partipost of holding payments for up to a year. | [survey·vendor, 2025](https://cube.asia/ecommerce-influencer-marketing-sea-2025/); [journalism, 2026](https://www.netinfluencer.com/southeast-asian-creators-accuse-influencer-marketing-platform-partipost-of-withholding-campaign-payments/) |
| **Bangladesh / Pakistan** | No PayPal or Stripe for receiving money. People use Payoneer or bank wires; one freelancer reports losing 40% to fees. | [journalism, 2024](https://www.tbsnews.net/node/965116); [docs, Stripe country list](https://stripe.com/global) |
| **A US brand paying a non-US creator** | The creator files a W-8BEN, not a W-9. The 30% withholding applies to services performed *in* the US. Wise USD account: ACH is free, a SWIFT wire costs $6.11, and intermediary banks may add fees. | [docs, IRS](https://www.irs.gov/individuals/international-taxpayers/pay-for-personal-services-performed); [docs, Wise](https://www.wise.com/help/articles/2827506/how-do-i-receive-money-with-my-usd-account-details) |

**Product implications:**
- **Store currency per deal from day one.** Deals in USD, EUR, INR and GBP will sit side by side for one creator.
- **Don't assume Stripe or PayPal can reach the creator.** Invoices must carry free-form bank or payment instructions.
- **Treat tax fields as text** (tax IDs, VAT/GST notes) rather than modelling every country's rules.

## 6. Problems, with evidence strength

### 6.1 Late or missing payments: **moderate–strong**
- **Delays are common:**
  - 48% of influencers were paid late, and 38.5% of those waited more than a month [survey·vendor, Lumanu, n=500+, 2024 work](https://www.lumanu.com/blog/insights-from-500-influencers-on-their-payment-experience).
  - 56% of creators had a payment delayed [survey·vendor, Tipalti, n=1,231, 2023](https://tipalti.com/blog/pr-2023-brand-creator-report/).
  - In a broader sample of creators and freelancers, 90% had trouble getting paid and 41% raised rates to cover it [survey·vendor, Tipalti/Wakefield, n=750, 2022](https://tipalti.com/press/tipalti-study-identifies-compensation-issues-as-threat-to-creator-economy-success/).
- **Payment delay was creators' top pain point** [survey·agency, n=500, Mar 2025](https://www.marketingbrew.com/stories/2025/03/28/survey-creators-seek-greater-transparency-in-brand-deals).
- **Terms of 90–120 days happen, and 180 occasionally.** One blue-chip brand paid 120 days late [journalism, Digiday, Jan 2026, link in §1].
- **Outside the US:**
  - India: some brand payments were more than a year overdue [journalism, 2025](https://www.storyboard18.com/amp/brand-makers/payment-delays-plague-influencer-marketing-agencies-as-major-brands-lag-behind-77033.htm).
  - Southeast Asia: creators accuse the platform Partipost of holding payments for up to a year (§5).
- **Caveat:** no independent random-sample study exists. The surveys and independent journalism point the same way.

### 6.2 Scattered communication: **moderate**
- **Deals arrive about equally by email (25.9%) and DM (23.8%)** [survey·vendor, AIC 2024](https://www.digitalinformationworld.com/2024/05/55-of-creators-prefer-social-media.html).
- **Instagram added a "Partnership messages" DM folder in 2021** so brand messages wouldn't get buried, which is a platform admitting the problem [journalism](https://www.socialmediatoday.com/news/instagram-adds-more-tools-to-help-creators-maximize-branded-content-partner/608718).
- **Heavy creators lose hours to brand email.** Creators doing 5–20+ deals a month spend 5+ hours a week sorting it [vendor marketing, n=30+, 2026](https://www.netinfluencer.com/creator-networking-platform-creatorland-launches-ai-tool-to-address-creator-inbox-overload-problem/). That is high-volume creators, not our beachhead.
- **Not verified:** that WhatsApp is the main deal channel in India, LatAm or SEA is widely claimed, with no credible source.

### 6.3 Missed deliverables and approval churn: **anecdotal**
- **Revisions are a real complaint:**
  - About a third of creators report excessive revisions [survey·agency, 2025].
  - 21.5% cite multiple feedback rounds and 29.6% unclear briefs [survey·vendor, AIC 2024].
- **Gifted deals often never get posted.** Marketers report creators skipping posting on gifting deals [survey·vendor, Modash, n=25 creators + 74 marketers, Jun 2026](https://www.modash.io/blog/creator-gifting-survey).
- **No evidence found that creators forget posting dates.** Treat "missed deliverables" as an assumption.

### 6.4 Messy invoicing and admin: **moderate for burden, anecdotal for specifics**
- **Creators struggle with admin:** over 80% aren't confident invoicing alone, and 70% say admin keeps them from going full-time [survey·vendor, Tipalti 2022](https://thefintechtimes.com/payment-issues-continue-to-snuff-out-the-full-potential-of-the-creator-economy/).
- **Big companies struggle to pay creators** without a registered business [vendor, Gigapay 2024](https://thefintechtimes.com/gigapay-reveals-how-influencers-can-work-better-with-enterprises-tackling-payment-challenges/).
- **Supplier portals exist as friction.** Vendors publish guides to getting creators through Coupa/Ariba vendor onboarding [vendor marketing](https://lumanu.com/blog/how-to-pay-creators-and-freelancers-if-your-company-uses-coupa). That shows the friction exists, not how common it is.
- **No prevalence data** for missing PO numbers or VAT/GST errors.

### 6.5 Unclear usage rights: **moderate**
- **Brands reuse content without permission:** 47% of creators had content used by a brand without permission, and 74% of those weren't paid [survey·vendor, MASV 2024](https://www.netinfluencer.com/masv-stolen-user-generated-content-report/).
- **Usage is often free:** 77% of brands reuse creator content in paid ads, and 67% fold usage into the base fee [survey·vendor, Aspire, ~900 respondents, 2026](https://www.aspire.io/blog/how-brands-and-creators-are-navigating-content-usage-rights-in-2026).
- **Even gifting asks for rights:** 40% of gifting offers also asked for usage rights [survey·vendor, Modash 2026].
- **It reaches court.** A June 2026 lawsuit alleges a brand altered an influencer's content beyond the contract [journalism](https://news.bloomberglaw.com/ip-law/influencer-sues-underwear-company-empowered-by-you-over-deepfake).
- **The platforms are catching up on the brand side.** Meta is merging Creator Marketplace and the Partnership Ads Hub into a "Creator Marketing Hub" with expiry dates on content permissions [journalism, netinfluencer.com, Jun 2026; exact URL not captured].

### 6.6 Scams and phishing dressed as brand deals: **strong (YouTube), moderate (Instagram)**
- **Google's Threat Analysis Group exposed a malware campaign** that had used fake sponsorship offers since 2019: about 15,000 attacker accounts and 1.6M blocked emails [data](https://blog.google/threat-analysis-group/phishing-campaign-targets-youtube-creators-cookie-theft-malware/).
- **More than 200,000 YouTubers were targeted** with "Collaboration Proposal" emails carrying malware disguised as contracts [security research, Dec 2024](https://www.infosecurity-magazine.com/news/youtube-creators-global-phishing/).
- **The Instagram "DM to collab" scam** offers a fake brand ambassadorship, then has the creator pay for shipping. This lands directly on fitness and lifestyle creators [journalism, 2021](https://www.vice.com/en/article/dm-to-collab-instagram-messages-scam/).

### 6.7 Not knowing what to charge: **moderate**
- **Creators find negotiation hard.** Nearly half say rate negotiation is their biggest challenge [survey·vendor, impact.com 2024, n undisclosed](https://inpublishing.co.uk/articles/commerce-creator-lighting-survey-results-revealed-24588).
- **Brands misprice too:** 45% of brand marketers have mispriced a creator deal [survey·agency, n=1,000, Jul 2026](https://www.netinfluencer.com/nearly-half-of-brands-have-mispriced-creator-deals-survey-finds/).
- **Pay transparency is low.** One study found a 35% pay gap between Black and white influencers, and 92% blamed lack of transparency [survey·agency, MSL 2021](https://mslgroup.com/whats-new-at-msl/msl-study-reveals-racial-pay-gap-influencer-marketing).

### 6.8 Tool sprawl: **weak**
- **Only vendor claims back it:** 31% of creators spend 11+ hours a month on admin [survey·vendor, Tipalti 2023].
- **The real incumbent is the free template.** The Notion Marketplace returns 100+ "brand deal" templates; most are free and each has little use [docs](https://www.notion.com/templates/search?query=brand%20deal).
- **This is the founder's core belief, and it has the weakest evidence.**

### 6.9 Cross-border payments and currencies: **strong that routes are costly, anecdotal for creators specifically**
- **PayPal fees stack up:** +1.5% on international commercial payments, plus a 3–4% currency-conversion spread [docs](https://www.paypal.com/us/business/paypal-business-fees).
- **GRIN pays creators only through PayPal** [vendor page](https://grin.co/app-marketplace/paypal/).
- **Stripe can't reach some countries.** Its country list leaves out Bangladesh, Pakistan and the Philippines [docs](https://stripe.com/global).
- **Small transfers are expensive everywhere.** Sending $200 costs 6.49% on average globally [data, World Bank Q1 2025](https://remittanceprices.worldbank.org).
- **YouTube's 2021 US-withholding rollout confused non-US creators** about W-8BEN [journalism](https://www.digitalmusicnews.com/2021/03/10/youtube-witholds-us-taxes/). That concerned platform payouts, but brand deals raise the same question.

### 6.10 Signals *against* the idea
- **Most small creators have little to manage:**
  - Most creators have never done a brand deal, and most who have earned under $100 a post [survey·vendor, Linktree, n=9,500, 2022](https://tubefilter.com/2022/04/20/linktree-2022-creator-report-economy-statistics-link-in-bio/).
  - About 80% of Collabstr deals are under $300 (§4).
- **Gifting means nothing to collect.** 6 in 10 brand offers are gifting: no invoice, nothing to chase [survey·vendor, Modash 2026].
- **The strongest payment-pain evidence comes from managers, agencies and high-volume creators.** A creator with 1–2 deals a month may be fine with a spreadsheet.

## 7. Current workarounds and tools

### 7.1 DIY: the real incumbent
- **Sources:**
  - Notion templates: 100+ "brand deal" templates in the marketplace, mostly free, plus paid copies on Gumroad.
  - Google Sheets trackers, mostly published by vendors as lead magnets [creatorstackclub.com](https://creatorstackclub.com/resources/brand-deal-tracker-template), [mysocial.io](https://mysocial.io/blog/brand-deal-tracker-template).
  - Calendar reminders, e.g. "45 days before campaign end" to catch renewals [practitioner](https://creatorsagency.co/blog/how-to-track-youtube-brand-deals).
- **The data model these templates share**, which is the strongest evidence of what creators actually track:
  - Brand
  - Contact, with the **accounts-payable contact kept separate from the marketing contact**
  - Source and platform
  - Stage: Lead → Negotiating → Contracted → In production → In review → Live → Invoiced → Paid / Lost
  - Deliverables, draft due date and live date
  - Fee and currency
  - Usage terms
  - Invoice number, invoice sent, payment due, received/balance and paid date
  - Next action and date
  - Renewal date
  - Notes

### 7.2 Creator-side tools

| Tool | Covers | Pricing | Source |
|---|---|---|---|
| **Beacons** | Media kit, AI pitch emails, rate calculator; invoicing (send, track, follow up) on paid plans | Free / $10 / $30 / $100 a month | [docs](https://beacons.ai/i/pricing) |
| **Passionfroot** | B2B creators (newsletter, YouTube, LinkedIn, podcast): storefront, booking, invoicing, payments | Free; 2% fee paid by the brand; 15% on deals it matches | [docs](https://passionfroot.me/creator-pricing) |
| **Stan Store, Linktree** | Storefront and link-in-bio. No deal management. | Stan $29/$99; Linktree free–$24 | third-party |
| **HoneyBook, Dubsado, Bonsai** | Generic freelancer CRMs: proposals, contracts, invoices. Nothing creator-specific (no usage rights, no deliverable types). | $25–109 a month | third-party |
| **Wave, FreshBooks, QuickBooks** | Invoicing and accounting only | Free–$21 a month | third-party |
| **Stripe, PayPal, Wise** | Collecting money | Stripe Invoicing 0.4% + processing; PayPal invoice 3.49% + $0.49; Wise $6.11 per USD wire received | [stripe](https://stripe.com/invoicing/pricing), [paypal](https://www.paypal.com/us/business/paypal-business-fees), [wise](https://wise.com/us/pricing/business) |

### 7.3 Creator deal CRMs (2025–26): a crowded, low-traction field

| Tool | What it does | Pricing |
|---|---|---|
| [Paperclip](https://papercliphq.com) | Deal tracker | Free for 5 deals, then $9.99 a month |
| [Vigl](https://vigl.app) | Deal tracker; invoices via Stripe | Free for 50 deals, then $14.99 a month |
| [Fandesk](https://fandesk.io/influencer-crm) | Contracts with usage-rights and late-fee clauses; payment reminders at T-3 / T0 / T+7 | €19 a month |
| [Tango](https://gotangocrm.com/influencer-crm) | Tracks usage rights and exclusivity; flags renewals | Not public |
| Manage Deals | Detects deals in the inbox; launched Apr 2026 | Not public |
| CreatorKhata | India-specific; handles GST/TDS | — |
| Superdeal | AI inbox plus escrow | — |
| Others | DealKit, Indly, Plug Pro, Influencer Inbox, GetSponsored, CreatorFlo, Stacx, Guapp | — |

- **They all offer the same features:** pipeline, deliverables, invoice, reminders, AI contract review, rate calculator.
- **None showed visible traction:** no meaningful reviews, ratings or user counts.
- **The lesson: features are not the moat.** Distribution and trust are.

### 7.4 Brand-side platforms: why a creator's records fragment
Each platform has its own inbox, brief, approval flow, payout schedule and tax form, so a creator working with three platforms has three partial records:

| Platform | How it handles the creator side | Source |
|---|---|---|
| **Aspire** | Pays by PayPal after approval, usually on 30–60 day terms | [docs](https://help.aspireiq.com/en/articles/6326989-how-do-payments-work-on-aspire) |
| **GRIN** | Pays by PayPal only | [vendor page](https://grin.co/app-marketplace/paypal/) |
| **CreatorIQ Pay** | Collects tax info and pays in 80+ markets | — |
| **#paid** | Has paid $50M+ to creators | — |
| **TikTok One** | Payouts sit in a Rewards Center inside the TikTok app | [docs](https://ads.tiktok.com/help) |
| **YouTube Creator Partnerships** (formerly BrandConnect) | Brands find creators on-platform; sources conflict on whether contracting and payment happen on or off platform | [docs](https://support.google.com/youtube/answer/9385307) |
| **Meta Creator Marketing Hub** | Announced Jun 2026 | — |
| **Collabstr** | Marketplace; about 15% off the creator's payout | third-party |
| **Agentio** | YouTube ad-slot marketplace; brands pay a 20% fee | — |

### 7.5 Payments-for-creators companies
- **Karat:** credit card and banking with automatic tax set-aside; Karat Tax from $299. Claims 100k+ creators. **No invoicing** [vendor marketing](https://trykarat.com).
- **Lumanu:** now sells mainly to brands and agencies as payout infrastructure. Creators onboard as vendors, with free ACH or paid "Instant Pay" [docs](https://lumanu.com/pricing).

### 7.6 Gaps no one fills well

1. **No single ledger across brand portals.** No tool found imports payouts from TikTok One, Aspire, GRIN or CreatorIQ, so creators re-key them by hand. This is our inference: we found no tool claiming the integration.
2. **Creator tools don't match how brands actually pay.** Brands pay through their own AP processes: vendor portals, W-9 or W-8BEN, PO numbers. No tool tracks *what this brand needs before it will pay* (AP contact, PO, tax form, net terms start date).
3. **Usage rights, exclusivity and whitelisting after the deal.** Only Tango and Fandesk mention them. Nobody watches for expiry or prompts the creator to charge for renewal.
4. **Chasing stops at reminders.** No tool tracks a brand's history of missing its net terms.
5. **Non-US and multi-currency creators are underserved.** PayPal-only payouts, limited country coverage, and only India has a local-tax tool.
6. **Tools that hold money lose trust.** Trustpilot reviews of Beacons describe payouts pending for over a year. **A tool that keeps records but never holds funds is a trust advantage.**

## 8. The global market

**Market sizes vary by source.** Analysts and vendors use different definitions of "creator" (one says ~50M, another ~200M), so treat the totals as an order of magnitude.

| Figure | Value | Source |
|---|---|---|
| Creator economy | $250B (2023) → ~$480B by 2027 | [analyst, Goldman Sachs 2023](https://www.goldmansachs.com/insights/articles/the-creator-economy-could-approach-half-a-trillion-dollars-by-2027) |
| Influencer marketing spend | $32.55B (2025), >$40B projected for 2026 | [vendor report, Influencer Marketing Hub](https://influencermarketinghub.com/influencer-marketing-statistics/) |
| US creator ad spend | $37B (2025, +26%) → $44B forecast (2026) | [trade body, IAB](https://www.iab.com/insights/2025-Creator-economy-ad-spend-strategy-report) |
| Fastest-growing region | Asia-Pacific, 16.22% CAGR to 2031 | [analyst, Mordor via Research and Markets](https://www.researchandmarkets.com/reports/6260907/influencer-advertising-market-share-analysis) |
| India | 2–2.5M monetised creators, only 8–10% monetise effectively | [analyst, BCG 2025](https://www.bcg.com/publications/2025/india-from-content-to-commerce-mapping-indias-creator-economy) |
| Africa | ~$3B creator economy, projected ~$17B by 2030 | [journalism](https://guardian.ng/life/life-features/creator-economy-in-africa-hits-3bn-to-reach-17bn-by-2030/) |

**Who earns, and from what:**
- **Brand deals are the main income source.**
  - About 70% of creator revenue comes from brand deals [analyst, Goldman Sachs 2023, link above].
  - 46% of creators say brand deals are the bulk of their income [survey·vendor, CreatorIQ, n=5,095, Aug 2026](https://www.tubefilter.com/2026/08/16/creators-rely-on-brand-deals-but-worry-about-the-tension-between-sponsors-and-viewers-and-just-15-say-they-fully-trust-sponsored-content-from-other-creators/amp/).
  - 81% earn from brand deals vs 8% from affiliate [survey·vendor, #paid, Apr 2026](https://www.netinfluencer.com/survey-81-percent-of-creators-rely-on-brand-deals-as-primary-income-amid-life-milestones/). That sample comes from a brand-deal marketplace, so it is skewed.
- **Income is concentrated at the top:**
  - Median creator payout is $3,000; the top 10% received 62% of all payments [survey·vendor, CreatorIQ, Jan 2026](https://www.netinfluencer.com/creatoriq-survey-finds-creator-pay-skews-to-top-tier-despite-rising-influencer-marketing-spend/).
  - Two-thirds of creators earn under $10k [CreatorIQ, Aug 2026, link above].
- **Small creators are most of the market, and spend is moving toward them:**
  - Nano creators (1k–10k) are 76–82% of Instagram influencers [vendor report, HypeAuditor 2025–26](https://hypeauditor.com/state-of-influencer-marketing-2025/).
  - 51% of marketers plan to increase nano spend and 53% micro, while macro is flat [survey·vendor, IMH Benchmark, May 2026](https://influencermarketinghub.com/influencer-marketing-benchmark-report/).
- **Fitness has no clean figure.** We found no data on its share of brand deals. Proxies:
  - Lifestyle is the largest Instagram influencer category at 13.7% [analyst, Statista 2023](https://statista.com/statistics/1123051/instagraminfluencers-share-world-category).
  - Health & fitness ranks 4th in brand demand [vendor report, Collabstr 2025](https://collabstr.com/2025-influencer-marketing-report).

**What this means:** the money flows through brand deals, but it is concentrated at the top. Our beachhead must be creators **with enough paid deals to feel the pain**, not the long tail of nano creators doing gifted posts.

## 9. Charging our customers globally (SaaS billing)

**This is about how *we* get paid, not how creators get paid by brands** (§5, §6.9).

### The constraint: the founder is based in Bangladesh
- **Stripe is not available to Bangladesh residents** [docs](https://stripe.com/global). Using it needs a foreign company (§10).
- **As a direct Stripe seller,** a non-EU business can owe EU VAT from the first sale (non-Union OSS), plus UK VAT and other countries' sales taxes.
  - Stripe Tax *calculates*; the seller still registers and files.
  - Stripe sells "Register for me" and partner filing at extra cost [docs, Stripe Tax].
- **A merchant of record (MoR)** is the legal seller. It collects and remits sales tax, VAT and GST worldwide and handles chargebacks. The cost is a higher fee and less control over checkout.

### Providers (checked 2026-10-03)

| Provider | Model | Fees | Bangladesh seller? | Payouts | Source |
|---|---|---|---|---|---|
| **Paddle** | MoR | 5% + 50¢, all-in | **Yes on paper.** Not on the unsupported list; individuals skip business verification | Wire or Payoneer, monthly, $100 minimum | [pricing](https://www.paddle.com/pricing), [countries](https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle) |
| **Polar** | MoR | 5% + 50¢, +1.5% non-US cards, +0.5% subscriptions. $15 per dispute; payout fees on top | **Listed.** Individuals are allowed if Stripe Connect Express supports them in the country, which is unverified for Bangladesh | Stripe Connect Express to a local bank | [countries](https://polar.sh/docs/merchant-of-record/supported-countries) |
| **Creem** | MoR | 3.9% + 40¢ | **Yes, with caveat.** Bank-partner limits apply, e.g. personal accounts only | Local bank ($7 or 1%), or USDC (2%). Twice a month, 7–12 day holds | [countries](https://docs.creem.io/merchant-of-record/supported-countries) |
| **Lemon Squeezy** | MoR (owned by Stripe) | 5% + 50¢ + surcharges | Bangladesh is on the bank-payout list, **but the product is winding down**: a Jan 2026 post admits slower support and fewer updates | Bank or PayPal (PayPal is not live in Bangladesh) | [2026 update](https://www.lemonsqueezy.com/blog/2026-update) |
| **Stripe Managed Payments** | MoR (GA 2026-04-29) | Stripe fees **+3.5%** | **No.** Limited to 37 business locations | Stripe | [eligibility](https://docs.stripe.com/payments/managed-payments/eligibility) |
| **Dodo Payments** | MoR | 4% + 40¢ + surcharges | **No for new accounts** since 2026-03-23. Eligibility follows the ID's country, so a US company doesn't get around it | — | [countries](https://docs.dodopayments.com/miscellaneous/accepted-countries-and-territories) |
| **Stripe direct** | Processor | ~2.9% + 30¢, +1.5% intl, +0.7% Billing, +0.5% Tax | **Only through a foreign company** | Bank in the company's country | [pricing](https://stripe.com/pricing) |
| FastSpring, 2Checkout | MoR | Quote-based; third parties report ~5.9% + 95¢ and ~6% + 60¢ | Not blocked on paper; 2Checkout reviews each application by hand, and one Bangladesh merchant reports rejection | — | [FastSpring](https://fastspring.com/terms-use/restricted-countries), [2Checkout](https://docs.2checkout.com) |

**Fee on a $15/month subscriber, international card:**

| Option | Fee | Note |
|---|---|---|
| Creem | ≈ $0.99 | plus payout fees |
| Stripe direct | ≈ $1.14 | before VAT compliance costs |
| Paddle | ≈ $1.25 | all-in |
| Polar | ≈ $1.48 | — |

The fixed 40–50¢ hurts low prices: it is 5% of a $10 plan. **Annual plans halve the effective fee.**

### Getting the money into Bangladesh
- **Licensed channels:** Bangladesh Bank allows IT-export income under $10k per transaction to come in through licensed payment providers [journalism, TBS, Jan 2025].
- **Cash incentive:** FY27 incentives are reported at 6% for software/ITES exports and 2.5% for freelancers [journalism, Dhaka Tribune]. That requires the money to arrive through a bank channel that documents it as export income.
- **Unverified:** how SaaS export income is treated for Bangladesh income tax and VAT. A Bangladeshi tax practitioner should confirm.

## 10. Company setup

**Not legal or tax advice.** Professional advice is needed on the points listed at the end of this section.

### Option A: sell as an individual through a merchant of record (MoR), with no company
- **Who accepts a Bangladesh individual:**
  - Paddle: individuals and sole traders skip business verification.
  - Polar and Creem: list Bangladesh, with the caveats in §9.
  - Dodo: its FAQ says it accepts unregistered individuals, but its country page bars new Bangladesh merchants since 2026-03-23. The country page is the more specific source.
- **What it costs and saves:**
  - Fixed cost is about $0 a year. Fees are per sale.
  - The MoR handles global VAT and sales tax.
  - It avoids US filing duties and the Bangladesh Bank foreign-entity reporting below.

### Option B: a US LLC (Stripe Atlas, Firstbase, or direct filing)

**Forming one**

| Item | Fact | Source |
|---|---|---|
| Stripe Atlas | $500 (Delaware + 1st year of registered agent), then $100/yr for the agent | [docs](https://docs.stripe.com/atlas/signup) |
| Atlas eligibility | No official country list. Atlas companies came from 169 countries in 2025; third parties say only sanctioned countries are excluded, and Bangladesh isn't one. | [blog](https://stripe.com/blog/stripe-atlas-startups-in-2025-year-in-review) |
| Atlas ID check | A passport is the only ID accepted when you live outside the account's country | [docs](https://docs.stripe.com/acceptable-verification-documents) |
| Firstbase | $99–399 to form; agent $299/yr; non-US tax filing (including Form 5472) $899/yr. Bangladesh not restricted. | [pricing](https://www.firstbase.io/pricing) |
| Direct Wyoming filing | $100 to form; $60/yr minimum | [third-party](https://www.zenind.com/help/post/wyoming-llc-fees-licenses-and-filing-requirements-2026-guide) |

**Every year after**

| Obligation | Fact | Source |
|---|---|---|
| Form 5472 + pro forma 1120 | Due every year, even with no activity. **$25,000 penalty** if missed. | [IRS](https://www.irs.gov/instructions/i5472) |
| Delaware LLC tax | **$400/yr** from tax year 2026 | [Delaware](https://corp.delaware.gov/alt-entitytaxinstructions/) |
| BOI reporting | All US-formed entities exempt (final rule effective 14 Aug 2026) | [FinCEN](https://www.fincen.gov/boi) |
| US income tax | Generally none without a US trade or business. Proposed 2025 cloud-sourcing rules could change that for SaaS. | [third-party](https://taxnews.ey.com/news/2025-9002) |

**Banking for a Bangladesh resident**

| Option | Status | Source |
|---|---|---|
| Mercury | **Bangladesh is prohibited** (residence-based) | [docs](https://support.mercury.com/hc/en-us/articles/28771710754580) |
| Wise | No USD account details for a Bangladesh address | [docs](https://wise.com/help/articles/2810318/can-i-get-usd-account-details) |
| Relay | Bangladesh not listed, but it needs some US operating presence | [docs](https://relayfi.com/hc/en-us/articles/10239600121748-Prohibited-Countries/) |
| Payoneer | Widely used; ~1% receiving fee | [third-party](https://www.nsave.com/bangladesh/payoneer) |

**Bangladesh side** [docs, Bangladesh Bank FEID Circular 02, Mar 2025](https://cdn5.ogrlegal.com/files/forex/feid/mar272025feid02e.pdf):
- **A resident can now legally own one foreign entity**, remitting up to $10,000 through their bank to set it up.
- **Conditions:** the idea must be "innovative", and investment and earnings must link back into Bangladesh.
- **Reporting:** the bank reports to Bangladesh Bank within a month of incorporation, and the owner files **annual audited financial statements** of the foreign company.
- **Without using this route,** owning a foreign company is unauthorised under the Foreign Exchange Regulation Act 1947.

**Estimated cost:** about $400–1,500 a year plus a foreign audit. The audit cost is unknown.

### Bangladesh tax on the income, either option
- **The ITES (IT-enabled services) income-tax exemption** covers SaaS and runs **1 Jul 2024 – 30 Jun 2027**. Income must come through banks, and the exemption certificate is renewed yearly [third-party](https://legalseba.com/bd-resources/tax-exemption-for-information-technology-enabled-services-ites-in-bangladesh/).
- **FY27 cash incentive:** 6% for software/ITES firms, 2.5% for freelancers. These are at risk after Bangladesh leaves least-developed-country (LDC) status on 24 Nov 2026 [journalism](https://thefinancialexpress.com.bd/economy/bangladesh/export-incentives-retained-for-43-sectors-in-fy-27).
- **Freelancer rules eased in July 2026:** electronic evidence accepted, up to $10k per payment via gateways, and 50% may be kept in a foreign-currency (ERQ) account [journalism](https://www.thedailystar.net/business/news/bangladesh-bank-eases-forex-rules-freelancers-4229851).

### Option C: a German company, after moving
- **Forms:**
  - A UG needs €1 minimum capital and a notary; the standard template costs about €240–500.
  - A GmbH needs €25k.
  - A managing director living outside the EU is allowed [docs, §5a GmbHG](https://www.gesetze-im-internet.de/gmbhg/__5a.html); [docs, BMWK](https://www.existenzgruendungsportal.de/Redaktion/DE/BMWK-Infopool/Antworten/Recht/Rechtsformen/UG-haftungsbeschraenkt/Wohnsitz-im-aussereuropaeischen-Ausland-UG-Unternehmergesellschaft-ode.html).
- **Tax:** about 30% combined corporate and trade tax [docs, GTAI](https://www.gtai.de/en/invest/investment-guide/corporate-taxation-in-germany).
- **A US LLC becomes awkward after a move to Germany** [third-party, PwC](https://blogs.pwc.de/en/steuern-und-recht/article/228702/):
  - Germany classifies each LLC case by case, so US and German tax treatment can mismatch.
  - Managing it from Germany brings it into German tax.
  - The anti-avoidance (CFC) rules can bite, because the LLC pays about 0% US tax.

### Get professional advice on
- **Bangladesh:** whether MoR payouts qualify for the ITES exemption and the cash incentive; the Circular 02 procedure and audit duties if a foreign company is ever formed.
- **US:** whether SaaS income would be US-taxable under the cloud-sourcing rules (only relevant with a US entity).
- **Germany:** before any move, how an existing LLC would be classified and taxed.

## 11. Legal basics for a global SaaS

**Not legal advice.** This is research for scoping; a lawyer reviews before paid launch, and Bangladeshi counsel handles Bangladesh law.

- **GDPR applies to us from the first EU user.** It covers a non-EU business that offers services to people in the EU (Art. 3(2)) [docs, EDPB 3/2018](https://edpb.europa.eu/sites/edpb/files/files/file1/edpb_guidelines_3_2018_territorial_scope_en.pdf).
- **We hold two roles** [docs, EDPB 07/2020](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-072020-concepts-controller-and-processor-gdpr_en):
  - We are **controller** for account, billing and analytics data.
  - We are **processor** for the brand contacts creators enter.
  - If we ever reuse that contact data for our own purposes (a shared brand directory, enrichment, AI training), we become a controller for it too. **That is a product decision with legal weight.**

### Checklist

| When | Item | Source |
|---|---|---|
| **Now (private beta)** | **Privacy policy:** who we are, what data, why, lawful basis, sub-processors, retention, transfers, rights, how to complain. A generator is fine; the real risk is a policy that doesn't match what the product does. | [docs, ICO](https://ico.org.uk/for-organisations/advice-for-small-organisations/privacy-notices-and-cookies/how-to-write-a-privacy-notice-and-what-goes-in-it/) |
| Now | **Terms of service:** beta "as-is", acceptable use, liability cap, termination and data deletion, governing law, 18+. | — |
| Now | **DPA (Art. 28)**, click-through with the terms. Includes the Standard Contractual Clauses (SCCs): Module 2 (creator → us, since Bangladesh has no EU adequacy decision) and Module 3 (us → sub-processors). | [docs, ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/contracts-and-liabilities-between-controllers-and-processors-multi/what-needs-to-be-included-in-the-contract/), [docs, EC SCCs](https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/new-standard-contractual-clauses-questions-and-answers-overview_en) |
| Now | **Public sub-processor list:** hosting, email, billing, monitoring, each with its location. | — |
| Now | **Vendor choice:** prefer vendors certified under the EU-US Data Privacy Framework, with SCCs as a fallback. The framework was upheld by the General Court in Sep 2025; an appeal (C-703/25 P) is pending. | [docs, EC](https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/eu-us-data-transfers_en), [curia](https://curia.europa.eu/site/upload/docs/application/pdf/2025-09/cp250106en.pdf) |
| Now | **Cookies:** only strictly necessary ones plus cookieless analytics, so no consent banner is needed. EU analytics cookies need consent; the UK relaxed this for statistics-only analytics on 5 Feb 2026. | [docs, EDPB 2/2023](https://www.edpb.europa.eu/system/files/documents/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf), [docs, ICO](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/) |
| Now | **Requests and breaches:** data export and deletion within one month (Art. 12(3)). Breach runbook: notify the regulator within 72h (Art. 33); as a processor, tell customers without undue delay. | — |
| Now | **Records of processing (Art. 30):** a spreadsheet is enough. The small-company exemption doesn't apply to regular processing. | [docs, EDPB SME](https://www.edpb.europa.eu/sme/be-compliant/be-compliant_en) |
| **Before paid launch** (strictly, from the first EU or UK user) | **EU representative (Art. 27) and UK representative.** The "occasional processing" exemption doesn't fit a SaaS. Becomes unnecessary for the EU once we have an EU company. | EDPB 3/2018 §4; [ICO](https://ico.org.uk/media2/migrated/4031113/ic-327905-y2y5-knowledge-hub-territorial-scope.pdf) |
| Before paid launch | **ICO fee** (£52 for the smallest tier); whether it applies to a non-UK company is unclear. | [ICO](https://ico.org.uk/dpfee-faq) |
| Before paid launch | **Lawyer review** of the terms, DPA and privacy policy. | — |
| Before paid launch | **Marketing email:** CAN-SPAM requires an ad label, a postal address and honouring unsubscribes within 10 business days. EU and UK marketing email needs consent or a soft opt-in. | [FTC](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business) |
| **If we move to Germany** | **Impressum** on the website (§5 DDG). | — |
| **Later** | **CCPA:** applies only from ~$26.6M revenue, or 100k+ California residents' data bought, sold or shared. It won't apply for a long time. | [CPPA](https://cppa.ca.gov/regulations/cpi_adjustment.html) |
| Later, but watch | **Bangladesh PDPA.** The Ordinance was gazetted Nov 2025 and is reported as an Act from Apr 2026. It requires explicit consent and data classification, and confidential data must stay in Bangladesh. Most obligations start ~May 2027. Whether it covers a Bangladeshi company processing only foreigners' data is unclear. | [journalism, TBS](https://www.tbsnews.net/node/1281356); [vendor summary](https://securiti.ai/bangladesh-personal-data-protection-act-overview/) |

## 12. What we could not verify

**Creator behaviour**
- **Deal volume:** how many paid deals a month 5k–100k fitness creators actually get. This is the single most important unknown (see assumption A1 in the brief).
- **WhatsApp as a deal channel** in India, LatAm and SEA.
- **First-hand forum evidence:** Reddit threads were inaccessible to the research tools.

**Competitors and platforms**
- **Usage of the new deal CRMs:** real user numbers for Tango, Manage Deals, Guapp and others.
- **YouTube Creator Partnerships:** whether contracting and payment happen on or off platform. Sources conflict.

**Billing**
- **Stripe Connect Express** onboarding of Bangladesh *individuals*, which decides whether Polar works for us.
- **Paddle's Payoneer payouts** and the SWIFT fee for Bangladesh specifically.
- **Creem's restriction** for Bangladesh.
- **Portability:** whether subscriber cards can move between MoRs.

**Legal and tax**
- **Bangladesh tax and VAT** treatment of SaaS export income.
- **Bangladesh PDPA:** effective dates and scope.
- **New SCCs** for importers already covered by Art. 3(2): promised, adoption unconfirmed.
