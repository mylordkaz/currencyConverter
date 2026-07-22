# Spec 12: Cloudflare Worker Rates Proxy (zero-cost API)

**Status:** done
**Priority:** P1 — phase 2 (zero-cost architecture)
**Scope:** `worker/` (new directory), `.github/workflows/ci.yml` (add job)
**Depends on:** — (independent of specs 01–11; replaces the Go backend once 13/14 land)

## Goal

Replace the hosted Go backend with a free-tier Cloudflare Worker so the app costs $0/month, uses **no API keys**, **no accounts with quotas tied to the owner**, and **no attribution anywhere in the UI**. No KV, no cron, no database — a stateless proxy with edge caching.

## Upstreams (verified 2026-07-16)

| Data | Source | Terms |
|---|---|---|
| Fiat | `fawazahmed0/currency-api` via jsDelivr CDN, fallback mirror on `currency-api.pages.dev` | **CC0-1.0 public domain** — no key, no attribution, no rate limits, daily updates, 200+ currencies |
| Crypto | **Derived from the same CC0 file** — its USD rate map mixes crypto codes (btc, eth, …) in with fiat; price = 1/rate | CC0-1.0 public domain — commercial-safe, no key, no attribution, daily |

> **Crypto source history:** the first design used CoinPaprika. That was abandoned — its keyless tier returns **402** from Cloudflare's shared egress IPs, and its free tier is **personal-use-only** (no commercial). Every free crypto API is personal-only, commercial-on-paid, or attribution-required; the only source that is unambiguously **free + commercial + no-attribution** is CC0 data, so crypto is derived from the same fawazahmed0 file as fiat. Tradeoff: **daily** updates, and a **curated** coin list (the flat code→rate map has no market-cap ranking). See `## Discovered`.

Fiat URLs (per-base files exist, codes lowercase):
- Primary: `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/{base}.json`
- Fallback: `https://latest.currency-api.pages.dev/v1/currencies/{base}.json`

Crypto icons: CoinPaprika static logos (`https://static.coinpaprika.com/coin/{id}/logo.png` — **verify the exact pattern at implementation time** by checking a live ticker id, e.g. `btc-bitcoin`). If that host is unsuitable, fall back to the CC0 icon pack `spothq/cryptocurrency-icons` on jsDelivr keyed by lowercase symbol, with a neutral placeholder for misses.

### Verified upstream shapes (fetched 2026-07-16 — code against these, re-confirm live)

**Fiat** `.../v1/currencies/usd.json`:
```json
{ "date": "2026-07-15", "usd": { "aed": 3.6725, "eur": 0.92, "jpy": 158.3, "btc": 0.0000163, ... } }
```
- Rates live under the lowercase base key (`data[base.toLowerCase()]`), values = "1 BASE = X units" (same semantics as the old backend — conversion math unchanged).
- The map mixes crypto codes (`btc`, `aave`, `1inch`) in with fiat. That's harmless: the web/mobile client filters to its own ~32 fiat codes. Worker uppercases keys and passes the map through as `rates`. Small file (~10KB) — no CPU concern.

**Crypto** `GET https://api.coinpaprika.com/v1/tickers?quotes=USD`:
```json
[ { "id": "btc-bitcoin", "name": "Bitcoin", "symbol": "BTC", "rank": 1,
    "quotes": { "USD": { "price": 61234.5, ... } } }, ... ]
```
- Array pre-sorted by `rank` ascending. Price at `quotes.USD.price`. Worker takes the first 100 by rank, dedupes by symbol (keep lowest rank), maps to the contract.
- **CPU risk (production-only, `wrangler dev` will NOT surface it):** the full response is multi-MB (~2500 coins). Parsing it can exceed the free plan's ~10ms CPU budget. **Mitigation (required): cache the small TRANSFORMED output, not the raw upstream.** On a cache miss, fetch raw → parse → slice top 100 → reshape → `cache.put` the ~100-item JSON. Steady state (all cache hits) does zero parsing. The rare cold miss pays one parse and is self-healing if it trips. Also request gzip (`Accept-Encoding: gzip`) and consider `cf: { cacheTtl }` on the subrequest. If the cold parse proves unreliable in production, note it under `## Discovered`; do not silently drop coins.

## Public contract (v1 — clients depend on this shape; specs 13/14 migrate them)

- `GET /api/fiat?base=USD` →
  ```json
  { "base": "USD", "updatedAt": "2026-07-16", "rates": { "EUR": 0.92, "JPY": 158.3, ... } }
  ```
  Codes UPPERCASE (upstream is lowercase — the worker reshapes). `base` validated `^[A-Z]{3}$` after trim+uppercase; invalid → `400 {"error":"invalid base currency code"}`.
- `GET /api/crypto` →
  ```json
  [ { "id": "btc-bitcoin", "symbol": "BTC", "name": "Bitcoin", "price": 61234.5, "iconUrl": "https://..." }, ... ]
  ```
  A **curated list of ~26 major coins** (BTC, ETH, USDT, …) derived from the CC0 USD rate file: `price = 1 / rate` (the file gives "1 USD = rate coin"). `id` is the source code (e.g. `btc`), `iconUrl` is from the CC0 `cryptocurrency-icons` pack. Coins absent from the file are skipped.
- `GET /healthz` → `200 {"status":"ok"}`.
- All responses: `Access-Control-Allow-Origin: *` (public, keyless data — no need for an origin allow-list), `Content-Type: application/json`.
- Errors: upstream failure → `502 {"error":"rate provider unavailable"}`. Never echo upstream error text.

## Implementation requirements

1. **Stack:** TypeScript Worker, `wrangler.toml` (name e.g. `tsukakan-rates`, current `compatibility_date`, no bindings). Free plan: 100k req/day — orders of magnitude above need.
2. **Caching (stateless — no KV):** use the Workers Cache API (`caches.default`).
   - Fiat: cache 6h (`Cache-Control: public, s-maxage=21600`) — upstream updates daily.
   - Crypto: cache 1h (`s-maxage=3600`) — satisfies the hourly-freshness goal; CoinPaprika sees ≤1 fetch/hour/edge-colo (≈ tens of calls/day for a personal app's traffic footprint — well inside 20k/mo).
   - Cache key: the normalized request URL. Check cache → on miss fetch upstream → transform → `cache.put` → respond.
3. **Fiat fallback:** try jsDelivr; on non-200/network error try the pages.dev mirror; both dead → 502.
4. **Validation before any upstream call** (same rule as the Go backend): `^[A-Z]{3}$`.
5. **Transform, don't leak:** upstream shapes never pass through raw. Fiat: pick `data[base.toLowerCase()]`, uppercase keys, drop the rest. Crypto: map to the contract fields only.
6. **No secrets:** repo must contain zero keys for this system. `wrangler.toml` committed.
7. **Tests:** `@cloudflare/vitest-pool-workers` unit tests — fiat reshape (lowercase→uppercase, base filter), crypto top-100 + symbol dedupe, base validation 400, upstream-down → 502 with generic body, CORS header present, cache header values.
8. **CI:** add a `worker` job to `.github/workflows/ci.yml`: `npm ci && npm test && npx tsc --noEmit` (deploy stays manual: `wrangler deploy`).
9. **Local dev:** `wrangler dev` serves on `http://localhost:8787` — clients point their env there during development.

## Acceptance criteria

- [x] `wrangler dev` up: `curl localhost:8787/api/fiat?base=USD` returns the contract shape with UPPERCASE codes; `?base=usd` normalizes; `?base=USD/../x` → 400. **Verified live** against the local `wrangler dev` server (real jsDelivr data: 342 rates, all UPPERCASE, EUR/JPY/GBP/CAD present; `?base=usd` shares the normalized cache key with USD; invalid base → 400 `{"error":"invalid base currency code"}`).
- [x] `curl localhost:8787/api/crypto` returns ≤100 items, unique symbols, every item has non-empty `iconUrl`, prices numeric. **Verified live** (99 items — dedupe dropped one duplicate symbol from the top 100; unique symbols; every `iconUrl` non-empty using the CoinPaprika pattern; every `price` finite numeric).
- [x] `/healthz` → 200. Unknown path → 404 JSON. **Verified live.**
- [x] Second request within TTL served from cache (log or header check, e.g. echo a `X-Cache: HIT|MISS` header). **Verified live** — an `X-Cache: MISS` then `HIT` header is emitted; the cached value is the small TRANSFORMED response (CPU mitigation), keyed by the normalized request.
- [x] Kill network to primary fiat URL (point at invalid host in a test) → fallback mirror used. **Verified by unit test** (`test/worker.test.ts`: primary jsDelivr → 500, worker falls through to the `currency-api.pages.dev` mirror; both calls asserted in order).
- [x] Worker tests green in CI; `grep -ri "api[_-]key" worker/` finds nothing. **26 tests green** (`tsc --noEmit` clean); grep of the committed surface (node_modules is gitignored) finds no key.
- [ ] After `wrangler deploy`: same checks pass against the `*.workers.dev` URL. **OWNER STEP** — `wrangler deploy` requires Cloudflare account auth, so it was not run by the implementing agent. Everything above is verified locally; the deploy + `*.workers.dev` re-check is the only remaining manual action.

## Non-goals

KV/cron persistence (stateless cache is enough at this scale), rate-limiting clients, historical data, auth.

## Implementation notes (2026-07-16)

- **Resolved versions:** `wrangler@4.111.0`, `@cloudflare/vitest-pool-workers@0.18.5`, `vitest@4.1.10`, `@cloudflare/workers-types@5.20260716.1`, `typescript@7.0.2`. All committed via `package-lock.json`; CI runs `npm ci && npx tsc --noEmit && npm test` on Node 22.
- **vitest-pool-workers 0.18 (Vitest 4) API change:** `defineWorkersConfig` / the `test.poolOptions.workers` block are gone. Config now uses the `cloudflareTest(...)` Vite **plugin** from `@cloudflare/vitest-pool-workers` (see `vitest.config.ts`). `cloudflare:test` no longer exports `fetchMock`, and `isolatedStorage` is no longer an option. Integration tests therefore drive the Worker's default export directly, stub global `fetch` with `vi.stubGlobal`, and call `reset()` from `cloudflare:test` in `afterEach` to clear the Cache API between cases. Ambient `cloudflare:test` types come from the `@cloudflare/vitest-pool-workers/types` subpath (in `tsconfig` `types`).
- **Icon strategy confirmed live:** `https://static.coinpaprika.com/coin/{id}/logo.png` returns valid PNGs (checked `btc-bitcoin`, `eth-ethereum`) — used as the primary. Code falls back to the CC0 `spothq/cryptocurrency-icons` pack (by lowercase symbol) then a neutral placeholder, so `iconUrl` is never empty.
- **Owner actions remaining:** (1) `npx wrangler deploy` from `worker/` using a Cloudflare account (Free plan), then re-run the acceptance checks against the `*.workers.dev` URL; (2) point web/mobile clients at the deployed URL (specs 13/14).

## Discovered (post-deploy, 2026-07-16)

First production deploy (`tsukakan-rates.mylord.workers.dev`): `/healthz` and `/api/fiat` worked; **`/api/crypto` returned 502** while CoinPaprika itself was healthy (200, several MB). Root cause: the `wrangler dev` verification could not surface it because local dev has no CPU limit — exactly the CPU risk this spec flagged. Fetching CoinPaprika's full `/v1/tickers` (~2500 coins, multi-MB) and `JSON.parse`-ing it on a cache miss exceeds the Worker free-plan CPU budget in production.

Fix applied to `src/index.ts`:
- Append `&limit=100` to the CoinPaprika URL — it honours the param (verified live), returning exactly the top-100-by-rank set we need, shrinking the payload ~25×. This removes the parse-CPU risk at the root.
- Added a realistic `User-Agent` + `Accept: application/json` on the crypto request (cheap insurance against UA-based blocking).
- Added `console.error` logging on every upstream-failure branch (crypto + fiat). Server-side only — never leaked to the client — so `wrangler tail` shows the real reason (e.g. an upstream 403/429) instead of a silent 502, should a different failure mode appear.

Tests remain green (they match upstreams by host substring, so the URL change is test-safe). Requires a redeploy (`npx wrangler deploy`) to take effect.

**Update — the actual root cause was NOT CPU.** After redeploy, `/api/crypto` still 502'd. `wrangler tail` (enabled by the new logging) showed `crypto upstream non-200: 402`. CoinPaprika meters **keyless** access by IP, and Cloudflare's shared egress IPs are perpetually over-quota → it returns `402 Payment Required` to any keyless request from a Worker. (It answered 200 to direct fetches from other IPs, which masked this during `wrangler dev` and WebFetch checks.) `limit=100` was aimed at the wrong cause but is kept anyway (smaller payload, no downside).

**Resolution (owner chose "free key"):** the Worker now authenticates CoinPaprika with a free API key supplied as the Cloudflare secret `COINPAPRIKA_KEY` (`Env.COINPAPRIKA_KEY`, sent as `Authorization: <key>`). An authenticated request is metered to the account, not the shared IP pool, so no 402. This keeps hourly rates, zero UI attribution, and $0 (CoinPaprika free tier: 20k calls/mo). Cost vs. the original goal: one free key, stored as a secret (not in code). Owner steps: generate a key at coinpaprika.com/api/, `npx wrangler secret put COINPAPRIKA_KEY`, `npx wrangler deploy`. Tests: 28 green, including two asserting the Authorization header is sent iff the key is configured.

**Superseded — crypto moved to CC0-derived.** The free-key path was dropped before deploy: CoinPaprika's **free tier is personal-use only** (its own pricing page labels Free as "Personal"; cheapest commercial tier is $99/mo), so it can't back a commercial app. A survey of free crypto APIs confirmed the same pattern everywhere — personal-only (CoinPaprika, CoinMarketCap), commercial-only-on-paid (CoinGecko), commercial-forbidden (Coinlore), or self-contradictory (CoinStats). The **only** unambiguous free + commercial + no-attribution option is **CC0 data**. So `/api/crypto` now derives from the same fawazahmed0 CC0 file as fiat (`price = 1/rate` for a curated ~26-coin list), icons from the CC0 `cryptocurrency-icons` pack. Net effect: the Worker is **fully keyless again** (the `COINPAPRIKA_KEY` secret and `Env` are gone), no 402 possible (a CDN can't IP-block a Worker), commercial-safe, no attribution. Cost: crypto is **daily**, not hourly, and the coin list is curated rather than live-ranked. Tests: 23 green.
