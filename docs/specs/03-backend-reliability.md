# Spec 03: Backend Reliability (caching, stampede, panics)

**Status:** done
**Priority:** P1
**Scope:** `backend/internal/service/currency_service.go`, `backend/internal/service/crypto_service.go`, `backend/internal/models/fiat.go`
**Depends on:** 02 (error-wrapping conventions), 05 (adds `golang.org/x/sync`)

## Problem

The fiat cache hammers the upstream once its data passes 24h of age, concurrent cold-cache requests each trigger their own upstream call, a type assertion can panic, and the fiat model carries a dead field.

## Current state (evidence)

1. **Stale-data stampede.** `currency_service.go:45` judges freshness by the API's own `time_last_update_unix`. ExchangeRate-API updates roughly daily. When the upstream hasn't refreshed yet, a refetch stores the *same* stale timestamp, so the next request misses again — every request hits the paid upstream until the provider updates. There is no record of when *we* fetched.
2. **No request coalescing.** Two concurrent requests with a cold/stale cache both reach `client.Do`. N concurrent requests = N paid upstream calls. Applies to both services.
3. **Panic risk.** `currency_service.go:43` — `cached.(*CachedRates)` unchecked; a type mismatch panics the request goroutine.
4. **Error path ignores usable stale data.** If the cache holds stale-but-valid rates and the refetch fails, the handler returns an error instead of serving the stale rates.
5. **Dead model field.** `models/fiat.go:6` — `ExchangeRates.Date` is never populated and never read by any client.

## Required changes

1. **Track fetch time.** Extend `CachedRates` with `FetchedAtUnix int64` (set to `time.Now().Unix()` when storing). Serve from cache when **either**:
   - API data is fresh: `now - LastUpdateUnix < 24h`, **or**
   - we fetched recently: `now - FetchedAtUnix < 15min` (cooldown — stops the stampede while the upstream is stale).
2. **Serve stale on refetch failure.** If a refetch errors and a cached entry exists, log the failure, update nothing, and return the cached rates. Only propagate the error when there is no cached data at all.
3. **Coalesce concurrent fetches** with `golang.org/x/sync/singleflight` in both services, keyed by the cache key. Only one goroutine performs the upstream call; the rest share its result.
4. **Checked type assertion:** `cachedData, ok := cached.(*CachedRates); if !ok { /* treat as cache miss */ }`.
5. **Remove `Date`** from `models.ExchangeRates` (no client reads it — verified in `frontend/src/App.tsx:99` and `mobile/hooks/useCurrencies.ts:65`, both use only `.rates`).
6. Keep `patrickmn/go-cache` (see spec 05) — this spec changes usage, not the library.

## Acceptance criteria

- [ ] Unit test: with a cached entry whose `LastUpdateUnix` is 25h old and `FetchedAtUnix` 1min old, `FetchCurrencies` does **not** call the upstream (assert via `httptest` hit counter).
- [ ] Unit test: cached entry 25h old + `FetchedAtUnix` 20min old → exactly one upstream call; on upstream 500, the stale rates are returned with no error.
- [ ] Unit test: 10 concurrent `FetchCurrencies` calls against a cold cache → upstream hit counter equals 1 (singleflight).
- [ ] Poisoning the cache with a wrong type does not panic; it behaves as a miss.
- [ ] `Date` field gone; `go build ./...` clean; frontend/mobile unaffected (they never read it).

## Out of scope

Optional enhancement (note under Discovered if pursued): `/api/crypto?ids=1,1027` backed by CMC `/v2/cryptocurrency/quotes/latest` so saved coins outside the top 100 keep resolving (pairs with specs 08/10 dropout handling).
