# Spec 14: Mobile Migration to Worker Contract

**Status:** done
**Priority:** P1 — phase 2
**Scope:** `mobile/hooks/useCurrencies.ts`, `mobile/lib/currency.ts` (comment only), `mobile/.env.example`, mobile tests
**Depends on:** 12; mirrors 13

## Goal

Same migration as spec 13, applied to `mobile/hooks/useCurrencies.ts`. Keep the two `lib/currency.ts` copies identical.

## Required changes

1. **Crypto mapper** in `useCurrencies.ts`: consume `{id, symbol, name, price, iconUrl}` → `Currency{id: "crypto-"+id, code: symbol, name, rate: price, flag: iconUrl, symbol, type:'crypto'}`. Remove the CMC icon URL construction. Client-side dedupe may be dropped if the worker guarantees uniqueness (mirror whatever spec 13 decided — the two clients must make the same choice).
2. **Fiat mapper**: unchanged read of `.rates`; adjust any response typing.
3. **Env:** `.env.example` → `EXPO_PUBLIC_API_URL=http://localhost:8787/` (comment: use LAN IP for a physical device, deployed workers.dev URL for builds).
4. **No attribution UI.**
5. **Tests:** mirror spec 13's mapper test updates under jest.

## Acceptance criteria

- [ ] App against `wrangler dev`: list loads, CoinPaprika icons render, drag/swipe unaffected. **OWNER/DEVICE STEP** — the runtime smoke test needs a simulator/physical device pointed at `wrangler dev` (or the deployed `*.workers.dev` URL); it cannot be run headlessly, so it was not executed by the implementing agent. All statically-verifiable criteria below pass.
- [x] `grep -rn "coinmarketcap" mobile/` (excluding node_modules) → nothing. **Verified** (no matches; the hand-built `s2.coinmarketcap.com/.../{id}.png` URL was removed from `hooks/useCurrencies.ts`).
- [x] `npx tsc --noEmit` + `npm test` green. **Verified** — `tsc --noEmit` clean (exit 0); `npm test` = 22/22 passing (1 suite; `lib/currency.ts` logic tests unchanged).
- [x] `lib/currency.ts` mirror check still passes (identical from `convertCurrency` to EOF). **Verified** — `mobile/lib/currency.ts` untouched and byte-identical to `frontend/src/lib/currency.ts` from `convertCurrency` to EOF.
