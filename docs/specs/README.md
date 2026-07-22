# Revival Specs — Index

Specs for reviving the currencyConverter project. Each spec is self-contained: an agent can pick one up, implement it, run the acceptance criteria, and mark it done by editing the `Status` line at the top of the spec file.

All `file:line` references are as of commit `bb7cc4e` (pre-fix state). Line numbers may drift as specs land — treat them as evidence pointers, not exact anchors.

## Execution order

Order matters: dependency upgrades come **before** code fixes in each app, so fixes are written once against the new stack (e.g., the drag-and-drop rewrite targets the replacement library, not the dead one).

| # | Spec | Priority | Depends on |
|---|------|----------|------------|
| 01 | [repo-hygiene](01-repo-hygiene.md) | P2 (do first — quick, clears noise) | — |
| 02 | [backend-security](02-backend-security.md) | **P0** | — |
| 03 | [backend-reliability](03-backend-reliability.md) | P1 | 02 |
| 04 | [backend-server-hardening](04-backend-server-hardening.md) | P1 | 02 |
| 05 | [backend-deps-upgrade](05-backend-deps-upgrade.md) | P1 | — |
| 06 | [docker](06-docker.md) | P1 | 05 |
| 07 | [frontend-deps-upgrade](07-frontend-deps-upgrade.md) | P1 | — |
| 08 | [frontend-fixes](08-frontend-fixes.md) | P1 | 07 |
| 09 | [mobile-deps-upgrade](09-mobile-deps-upgrade.md) | P1 | — |
| 10 | [mobile-fixes](10-mobile-fixes.md) | P1 | 09 |
| 11 | [testing](11-testing.md) | P1 (last — verifies everything) | 02–10 |

Recommended sequence: `01 → 02 → 05 → 03 → 04 → 06 → 07 → 08 → 09 → 10 → 11`.

Backend specs (02–06), frontend specs (07–08), and mobile specs (09–10) are three independent tracks and can run in parallel with each other.

## Phase 2 — zero-cost architecture (Cloudflare Worker, no API keys, no attribution)

Replaces the hosted Go backend with a free-tier Cloudflare Worker proxying keyless, attribution-free sources (fiat: `fawazahmed0/exchange-api`, CC0; crypto: CoinPaprika free tier). Decided 2026-07-16 after the API-cost research.

| # | Spec | Priority | Depends on |
|---|------|----------|------------|
| 12 | [cloudflare-worker](12-cloudflare-worker.md) | P1 | — |
| 13 | [frontend-worker-migration](13-frontend-worker-migration.md) | P1 | 12 |
| 14 | [mobile-worker-migration](14-mobile-worker-migration.md) | P1 | 12 |
| 15 | [backend-retirement](15-backend-retirement.md) | P2 — **owner confirmation required** | 12, 13, 14 |

Sequence: `12 → (13 ∥ 14) → 15`. After 15, the system has zero secrets, zero monthly cost, and zero UI attribution.

**Execution state (2026-07-16):** specs 12–15 done. Spec 15 executed as **archive** (owner's choice) — the Go backend moved to `archive/backend/` (preserved, runnable, out of CI), not deleted. Remaining owner steps: `cd worker && npx wrangler deploy`, point the clients' real `.env` at the deployed URL, smoke-test web + mobile. The old ExchangeRate-API key can be deleted from the owner's account (nothing uses it now).

## Conventions for implementing agents

- Update the `Status:` line in the spec you work on (`open` → `in-progress` → `done`).
- Stay inside the spec's `Scope` paths. If you discover an adjacent problem, note it at the bottom of the spec under a `## Discovered` heading instead of fixing it.
- Every spec has acceptance criteria. Run them. Do not mark `done` on "should work".
- Version numbers in the deps specs say "latest stable at execution time" — resolve them when you run, don't trust versions frozen into this doc.

## Manual actions (owner, not agent)

- **Rotate the ExchangeRate-API key** after spec 02 lands. The current key has been exposed via error responses and URL-embedded logging (see spec 02). Rotating before the fix is pointless; rotating after is mandatory.
- Review the CoinMarketCap key: it is sent via header (not URL) so exposure is unlikely, but rotate if server logs were ever shared.
- **Branding decision:** web is titled "Tsukakan", mobile (the surviving `mobile_V1` codebase) was rebranded "Money Swap" with the Delius font in the latest feature commit (`4aca63b`, 2025-02-15). Specs preserve each platform's current branding; unify whenever you decide which name wins.
- **EAS slug:** the mobile app keeps slug `mobile_V1` because it is bound to the existing EAS project (`62f35feb-…`). Renaming the slug means creating a new EAS project — say so explicitly if wanted (see spec 01 §A5).

## Verification quick reference

```bash
# backend
cd backend && go build ./... && go vet ./... && go test ./...

# frontend
cd frontend && npm run lint && npm run build && npm test

# mobile
cd mobile && npx tsc --noEmit && npx expo-doctor && npm test
```
