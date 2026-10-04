# ADR-003: Repository visibility and license

- **Status:** Accepted
- **Date:** 2026-10-04
- **Decided by:** founder (a business-level decision, confirmed 2026-10-04)
- **Related:** [brief §5](../product/brief.md) (features are not a moat), [brief §8](../product/brief.md) (company setup), `CLAUDE.md` ("portfolio project: the repo must show planning → decisions → execution")

**This is not legal advice.** A lawyer should review licensing and IP ownership before a company is formed or outside contributions are accepted.

## Context

**This repository serves two goals that pull in opposite directions:**
1. **A senior-engineering job search.** The planning trail (brief, research, ADRs, PR descriptions, issues with acceptance criteria) and the code are the evidence. Hiring managers will only look at what they can open without asking.
2. **A real product.** Creator Deal OS should be able to become a business. A competitor could take the code and run a competing hosted service.

**Facts (checked 2026-10-04):**

**What "public" means today**
- **The repo is already public, with no LICENSE file.**
- **Public with no license means default copyright:** "you retain all rights… no one may reproduce, distribute, or create derivative works" ([GitHub docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)).
  - GitHub's Terms (D.5) only let others **view and fork within GitHub**.
  - Running or deploying the code elsewhere would be infringement, and enforcement is up to the owner.
  - **Readers often can't tell what's allowed.**

**What private would cost**
- **Hiring managers see almost nothing.** Private contributions show on a profile only as anonymised daily counts. Collaborators can be invited, but hiring managers rarely ask for access ([GitHub docs](https://docs.github.com/en/account-and-profile/concepts/contributions-on-your-profile)).
- **Security scanning gets worse.** Secret scanning and push protection are free and on by default for public repos. For private repos they need a paid plan ([GitHub docs](https://docs.github.com/en/code-security/getting-started/github-security-features)).

**How the licenses differ**
- **FSL-1.1 (Functional Source License),** [fsl.software](https://fsl.software/):
  - Allows everything except **"Competing Use"**: offering the software, or something substantially similar, as a commercial product or service.
  - Each version **converts irrevocably to Apache-2.0 (or MIT) two years after it's published**.
  - Used by Sentry, GitButler, PowerSync and Liquibase. It's "Fair Source", not OSI open source.
- **AGPL-3.0:** a competitor *can* host a clone, as long as they publish their modifications. Dual licensing needs a CLA.
  - Plausible and Documenso use it. Cal.com moved away from it in 2026.
- **BUSL-1.1:** a custom "Additional Use Grant", converting after up to 4 years.
  - HashiCorp's switch to it prompted the OpenTofu fork.
- **MIT / Apache-2.0:** anyone may run a competing hosted service, including a closed one.

**Practicalities**
- **Relicensing:** the owner can relicense future versions, but **licenses already granted on released code can't be taken back**.
- **Ownership:** the founder personally owns the copyright until it's assigned to a company.
  - In Germany, copyright itself can't be transferred (§29 UrhG); only exclusive usage rights can be granted.
- **Trademarks** are separate from any copyright license.

**What actually protects the business:**
- **Brief §5 already assumes "anything we build can be copied in weeks".** There are 15+ near-identical competitors.
- **The moat is distribution, trust and focus**, not the source code.
- **Realistic threat:** someone hosts a lightly rebranded copy.
- **Unrealistic threat:** someone outcompetes us because they can read our code.

## Options

| Option | Stops a hosted clone? | Job-search visibility | Clear to readers? | Complexity | Notes |
|---|---|---|---|---|---|
| A. **Private** | Yes (code unseen) | **Low**: anonymised counts; invite-only | n/a | Lowest | Loses free secret scanning and push protection; the portfolio goal mostly fails |
| B. **Public, no license** (today) | Legally yes, if enforced | High | **No**: looks like an oversight; reviewers can't tell if they may even run it | Lowest | Maximum legal restriction, minimum clarity |
| C. **Public, explicit "all rights reserved"** notice | Legally yes, if enforced | High | Yes | Low, but a **custom proprietary text** | Clear, but unfriendly; doesn't even allow internal or evaluation use unless drafted carefully |
| D. **Public + FSL-1.1-ALv2** | **Yes, for 2 years per version** | High | **Yes**: a standard, recognised text | Low | Reading, running, internal use, education and research allowed; competing commercial use banned; becomes Apache-2.0 later |
| E. **Public + AGPL-3.0** | **No**: an open clone is allowed | High | Yes | Medium (CLA for dual licensing) | OSI "open source" label |
| F. Public + BUSL-1.1 / PolyForm Shield / ELv2 | Yes (BUSL up to 4 years; Shield and ELv2 permanent) | High | Mostly | Medium | BUSL needs a custom grant; Shield and ELv2 are less recognised by developers |
| G. Public + MIT / Apache-2.0 | **No** | High | Yes | Lowest | Gives the product away |

## Decision

**Option D: keep the repo public and license it under FSL-1.1-ALv2.**

**Why:**
1. **Visibility is the near-term goal.** It's what serves the job search. Private (A) throws away the main portfolio value of this project: the public trail of decisions.
2. **FSL blocks the realistic threat,** a commercial hosted clone, **for the period that matters.** Two-year-old code of a fast-moving SaaS is worth little. Converting to Apache-2.0 later costs almost nothing and earns goodwill.
3. **It's a standard, recognised text.** It needs no lawyer-drafted custom grant (unlike BUSL or C) and has an SPDX identifier. It tells a reviewer exactly what they may do: read, run locally, learn from it.
4. **No license (B) is the worst of both worlds.** It's legally restrictive but *looks* like an oversight, and a reviewer can't tell whether they may even clone and run it.
5. **AGPL (E) doesn't stop the threat we care about,** and an "open source" label isn't a goal here.

**What goes with it, whatever license is chosen:**
- **`LICENSE.md`:** the exact FSL-1.1-ALv2 text from fsl.software, unmodified except for the notice line, "Copyright 2026 Sagor66".
  - **The licensor is the founder's GitHub handle for now.** Replace it with the founder's legal name, or the company's name once IP moves to it (next bullet).
- **IP ownership:** once a company exists, the founder assigns copyright to it (US) or grants it exclusive usage rights (Germany, §29 UrhG), with a lawyer.
- **No outside code contributions for now.** `CONTRIBUTING.md` says so. A CLA comes first if that changes, so licensing stays in one hand.
- **Trademark:** a README note that the name and logo aren't licensed.
- **Security hygiene:**
  - `SECURITY.md` with GitHub private vulnerability reporting.
  - Secret scanning and push protection stay on (default for public repos).
  - Dependabot alerts on.
- **What stays out of git, by policy:** customer data, interview notes, secrets and business-sensitive numbers (e.g. revenue). Already practised in `docs/product/validation.md`.

## Consequences

**Positive:**
- **Full portfolio value.** The code, ADRs, PRs and issues are public and clearly licensed.
- **Legal protection against a hosted clone** for two years per version.
- **Free security tooling** (secret scanning, push protection).
- **A credible "source-available" story** for the product's privacy-conscious customers: they can read how their data is handled.

**Negative, and accepted:**
- **Not OSI open source.** Some developers dislike source-available licenses.
- **Every version eventually becomes Apache-2.0.** After 2 years, anyone may host that old version.
- **Competitors can *read* our approach** (data model, tenant isolation design) immediately. Accepted: the brief assumes features are copyable anyway, and security must never rely on obscurity.
- **Enforcement is on us.** A license deters; it doesn't police.
- **The license must be re-pointed to the company** once one exists, and the IP assignment done properly.

## When we'd revisit
- **Raising money, or a buyer who requires a different license:** switch for future versions. Released versions keep FSL.
- **A hosted clone appears despite FSL:** enforce. If the product's moat really is the code, reconsider moving future versions private.
- **Outside contributors want to help:** add a CLA before accepting any code.
- **The job search ends and the product becomes the only goal:** re-weigh private vs public. Moving future development private is possible; FSL grants on already-public versions remain.
