# Spec 11: Testing & CI

**Status:** done
**Priority:** P1 (run last — locks in every other spec)
**Scope:** `backend/**/*_test.go`, `frontend/src/**/*.test.ts`, `mobile/**/*-test.ts(x)`, `.github/workflows/`
**Depends on:** 02, 03, 04, 08, 10

## Problem

Zero meaningful tests. The conversion math (4 type combinations), the cache/stampede logic, and the security fixes all have no regression protection. Mobile has one template snapshot test (`ThemedText-test.tsx`) only.

## Required changes

### Backend (`go test`, httptest doubles — no live API calls)

Restructure services minimally for testability: base URLs already injected via constructor — point them at `httptest.Server`s.

1. **`currency_service_test.go`:**
   - success: parses rates, caches result.
   - upstream non-200 → `ErrUpstream`.
   - `result != "success"` body → error.
   - cache hit: second call, upstream hit counter stays 1.
   - stale-data cooldown: entry with `LastUpdateUnix` 25h old, `FetchedAtUnix` 1min old → no upstream call (spec 03 §1).
   - stale + expired cooldown + upstream 500 → stale rates returned, no error (spec 03 §2).
   - singleflight: 10 goroutines, cold cache → counter == 1 (spec 03 §3).
2. **`crypto_service_test.go`:** success parse, non-200, cache hit, singleflight, and CMC header present (`X-CMC_PRO_API_KEY`).
3. **`handlers_test.go`** (gin test context):
   - `?base=usd` → normalized, 200.
   - `?base=USD/../x` and `?base=TOOLONG` → 400, zero upstream hits.
   - **Security regression:** with a failing upstream whose URL contains a fake key, the 502 response body must not contain the key or the upstream host (spec 02).
   - `/healthz` → 200.

### Frontend (Vitest)

4. Add `vitest` (+ config, `"test": "vitest run"` script). Test `src/lib/currency.ts`:
   - `convertCurrency`: all four combinations with realistic rates — fiat→fiat (JPY→EUR via USD-based rates), fiat→crypto, crypto→fiat, crypto→crypto; identity (same code); NaN amount → null; zero rate → null.
   - `getDescriptionRate` consistency: for every combination, `getDescriptionRate(c, base) === convertCurrency(1, base, c)` within float tolerance.
   - `formatAmount`: `1234.567` → 2 decimals; `0.00000011` → 4 significant digits, not `0.0000`; `0` → `0.00`.
   - `getFlagEmoji('USD')` → 🇺🇸; explicit-override path for non-country codes.

### Mobile (jest-expo, already configured)

5. Mirror the `lib/currency.ts` test file (same cases). Delete the template `ThemedText-test.tsx` if `ThemedText` is unused in the app (verify first).

### CI

6. GitHub Actions workflow `.github/workflows/ci.yml`: three jobs (backend: `go vet` + `go test ./...`; frontend: `npm ci && npm run lint && npm test && npm run build`; mobile: `npm ci && npx tsc --noEmit && npm test`), triggered on PR + push to `main`. Pin action majors; use the Go version from `go.mod` and Node LTS.

## Acceptance criteria

- [ ] `go test ./...` green, includes the security-regression test, no network access (run once with Wi-Fi off to prove it).
- [ ] `npm test` green in `frontend/` and `mobile/`.
- [ ] Conversion tests fail if any formula's multiply/divide is flipped (mutate one operator locally to confirm the tests actually bite, then revert).
- [ ] CI workflow passes on a PR touching all three components.
