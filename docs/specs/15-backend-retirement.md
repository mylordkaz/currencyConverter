# Spec 15: Go Backend Retirement (Archived)

**Status:** done — **Option C (archive) chosen by owner and executed.** Code preserved at `archive/backend/`, un-wired from CI/docs, not deleted.
**Priority:** P2 — phase 2, last
**Scope:** `backend/` → `archive/backend/`, `.github/workflows/ci.yml`, `README.md`, `archive/README.md`, `docs/specs/README.md`
**Depends on:** 12 (worker built + verified), 13 + 14 merged

## Rationale

With the Worker serving both endpoints from keyless, attribution-free sources, the Go backend has no production role: keeping it live means hosting cost (the only real cost in the system), a second implementation to keep in sync, and two API keys to manage. But the phase-1 hardening work (specs 02–06) has value as reference, so the owner chose to **archive rather than delete**.

## Decision (owner)

- ~~Option A — delete~~
- ~~Option B — keep live as dev harness~~
- **Option C — archive (chosen):** un-wire the backend (out of CI, out of the active docs/deploy path) but keep the code in the tree at `archive/backend/`, runnable, clearly marked as retired.

## Executed

1. `mv backend archive/backend` (filesystem move — the tree had uncommitted phase-1/2 changes and untracked files, so `git mv` would have stranded them). Verified the archived module still builds and tests pass from its new location (`cd archive/backend && go build ./... && go test ./...` — green; the Go module is self-contained so the path change is harmless).
2. Removed the `backend` job from `.github/workflows/ci.yml`, leaving a comment that the archived backend is intentionally not built in CI.
3. `README.md`: replaced the backend section with the worker (deploy + local dev), dropped the ExchangeRate-API / CoinMarketCap key prerequisites (system needs **no keys**), updated the components table + repo layout, linked `archive/README.md`.
4. Added `archive/README.md` explaining what's archived, why, and how to still run it.
5. `docs/specs/README.md`: phase-2 note updated to reflect archival.

## Notes

- The clients (specs 13/14) target the Worker's response shape, which differs from this backend's CoinMarketCap-shaped `/api/crypto`. Pointing a client back at the archived backend would also require reverting 13/14. Documented in `archive/README.md`.
- **Owner action still outstanding (independent of this spec):** deploy the worker (`cd worker && npx wrangler deploy`) and smoke-test both clients against the deployed URL. Archival does not depend on the deploy — the clients were already migrated — but production isn't live until you deploy.
- The old ExchangeRate-API key (flagged for rotation in spec 02) can now simply be **deleted** from your account — nothing uses it once the backend is archived and unused.

## Acceptance criteria

- [x] Owner chose the archive approach (Option C) explicitly.
- [x] `backend/` no longer in the active tree; code preserved at `archive/backend/`, still builds + tests green there.
- [x] `backend` CI job removed; workflow still valid YAML (frontend, mobile, worker jobs intact).
- [x] README describes the worker as the live API; backend referenced only as archived. No API-key prerequisites remain.
- [ ] Web + mobile verified against the **deployed** worker — OWNER step (needs `wrangler deploy` + device/browser).
