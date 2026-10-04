<!-- Title: Conventional Commit style, e.g. "feat(api): add readiness endpoint" -->

## What
<!-- What changed, in a few bullets. A reviewer should know what to look at without opening every file. -->

## Why
<!-- The problem this solves. Link the issue and any ADR or design note. -->
Closes #
ADR / design note:

## Trade-offs and rejected alternatives
<!-- What else was considered and why it lost. What this choice costs us. -->

## How tested
<!-- Automated tests added or changed, and what you checked by hand. Say what was NOT tested. -->

## Evidence
<!-- Test output, CI link, screenshots, logs, timings: proof it works, not a claim that it does. -->

---
- [ ] Tests cover the change (repository tests run against real MySQL)
- [ ] No secrets or real customer data in code, tests, logs or screenshots
- [ ] Design note in `docs/design/` or ADR in `docs/adr/` for any non-trivial change or real choice
- [ ] Docs updated if behaviour, config or setup changed (`.env.example`, README, runbooks)
