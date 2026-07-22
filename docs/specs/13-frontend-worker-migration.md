# Spec 13: Frontend Migration to Worker Contract

**Status:** done — statically verified (lint + build + test green; `grep -rn "coinmarketcap" frontend/src/` returns nothing). The app-against-worker smoke test (`wrangler dev` + `npm run dev`, acceptance criterion 1) remains an OWNER step.
**Priority:** P1 — phase 2
**Scope:** `frontend/src/**`, `frontend/.env.example`
**Depends on:** 12 (worker contract live at least under `wrangler dev`)

## Goal

Point the web app at the Worker's v1 contract (spec 12), removing the CoinMarketCap-shaped crypto mapping and the CMC icon hotlinks. Conversion math and UI unchanged.

## Required changes

1. **Crypto mapper** (`src/App.tsx`, `fetchCryptoCurrencies`): consume the new shape `{id, symbol, name, price, iconUrl}`:
   - `Currency.id` → `crypto-${item.id}` (CoinPaprika string id — the `Currency.id` field is already a string; update the doc comment in `lib/currency.ts` on both copies, keeping them in sync per the mirror rule).
   - `rate` → `item.price` (semantics identical: USD per 1 unit — conversion formulas untouched).
   - `flag` → `item.iconUrl` (replaces the hand-built `s2.coinmarketcap.com/.../{id}.png` URL).
   - Dedupe-by-symbol can be dropped client-side **only if** kept in the worker (spec 12 dedupes; leave a comment noting the worker guarantees uniqueness).
2. **Fiat mapper** (`fetchFiatCurrencies`): new response nests the same `rates` map plus `updatedAt` — reading `response.data.rates` keeps working; just update the `FiatResponse` type (add `base`, `updatedAt`).
3. **Env:** `.env.example` → `VITE_API_URL=http://localhost:8787/` with a comment showing the deployed `https://<name>.workers.dev/` form.
4. **No attribution UI anywhere** — that's the point of the source selection. Do not add credit lines.
5. **Tests:** update/extend the Vitest suite for the new mapper (fixture with a duplicate-symbol payload if client-side dedupe is retained; iconUrl passthrough). `lib/currency.ts` logic tests unchanged.

## Acceptance criteria

- [ ] With `wrangler dev` + `npm run dev`: list loads, crypto rows show CoinPaprika icons, conversions identical to before for the same rates.
- [ ] `grep -rn "coinmarketcap" frontend/src/` → nothing.
- [ ] `npm run lint && npm run build && npm test` green.
- [ ] `frontend/src/lib/currency.ts` and `mobile/lib/currency.ts` still identical from `convertCurrency` to EOF.
