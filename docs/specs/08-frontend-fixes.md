# Spec 08: Frontend Fixes (web)

**Status:** done
**Priority:** P1
**Scope:** `frontend/src/**`
**Depends on:** 07 (implement against the upgraded stack)

## Problem

Collection of functional bugs and dead code in the web app: broken input element, wasteful refetching, React key collisions, fragile URL joining, precision loss on crypto values, and duplicated conversion logic.

## Current state (evidence) & required changes

1. **Broken input.** `App.tsx:218` — `<input type="">`. Change to `type="text" inputMode="decimal"`, and sanitize in `handleAmountChange` (allow only digits and one decimal separator: reject the keystroke otherwise). Letters currently pass through and silently convert as 0.

2. **Pointless refetch.** `App.tsx:81-89` — effect depends on `baseCurrency`, but both requests hardcode `base=USD` (conversion is fully client-side). Every base switch refetches identical data. Fetch once with `[]` deps. Delete the `console.log`s (they log stale closure state anyway). Delete the unused `_baseCurrency` param from `convertCurrency` (`App.tsx:28`).

3. **Key collisions / wrong-currency lookup.** `key={currency.code}` and `draggableId={currency.code}` (`App.tsx:264-267`); CMC listings can contain duplicate ticker symbols, and a crypto ticker can collide with a fiat code — `allCurrencies.find(c => c.code === code)` then resolves the wrong asset.
   - Add `id: string` to the `Currency` interface: fiat → `fiat-USD`, crypto → `crypto-<cmc numeric id>`.
   - Deduplicate cryptos by symbol on ingest (keep first occurrence = highest market cap) so code-based user selections stay unambiguous.
   - Use `currency.id` for `key` and `draggableId`.
   - Persisted `currencyList` (localStorage) keeps storing codes — fine after dedupe; do not break existing saved lists.

4. **Fragile URL join.** `App.tsx:97,123` — `${apiURL}api/fiat` requires `VITE_API_URL` to end with `/`. Add a tiny helper: strip trailing slashes from the base, join with `/`. Fail fast with a clear console error if `VITE_API_URL` is unset.

5. **Precision loss.** Converted amounts use `toFixed(2)` (`App.tsx:294`) and description rates `toFixed(4)` (`App.tsx:160`) — 1 JPY in BTC renders as `0.0000`. Add a `formatAmount(value)` helper: `Intl.NumberFormat` with `maximumFractionDigits: 2` for values ≥ 1, `maximumSignificantDigits: 4` for values < 1 (0 stays "0.00"). Use it for both amount and description rate. Remove the pointless optional chain `descriptionRate?.toFixed(4)` (`App.tsx:160`) — it's a plain number.

6. **Division-by-zero guard.** In `convertCurrency` and `getDescriptionRate`, a zero/negative `rate` yields `Infinity`. Guard: `if (from.rate <= 0 || to.rate <= 0) return null`.

7. **Extract shared module.** Move `Currency` type, `convertCurrency`, `getDescriptionRate`, `getDescription`, `getFlagEmoji`, and the new `formatAmount` into `src/lib/currency.ts`. `App.tsx` shrinks to state + rendering. This module is the unit-test target in spec 11. (The conversion math itself is correct — all four fiat/crypto combinations verified — do not change formulas.)

8. **Persist more state.** Persist `baseCurrency` and `amount` to localStorage alongside `currencyList` (`App.tsx:74-77,91-93`); restore on load with `USD`/`''` fallbacks.

9. **Expand fiat coverage.** `service/currencyInfo.ts` hardcodes 10 currencies; the API returns ~160. Expand the curated map to the ~30 most-traded (include SGD, KRW, INR, BRL, MXN, SEK, NOK, DKK, PLN, THB, TWD, ZAR, TRY, AED, etc.). Constraint: `getFlagEmoji` derives the flag from the first two letters of the code — that trick fails for codes whose prefix isn't an ISO country (e.g. `XOF`). For any such addition, add an explicit `flag` override in the map (EUR works: `EU` is a valid flag region). Do not auto-ingest all 160 without flag handling.

10. **Missing-currency row.** `App.tsx:241-246` — a saved code that no longer resolves (crypto dropped out of CMC top 100) silently disappears (`console.log` only). Render a muted row showing the code with "rate unavailable" and a remove affordance instead of vanishing.

11. **Console hygiene.** Remove remaining `console.log`s; keep `console.error` in catch blocks.

## Acceptance criteria

- [ ] Typing letters into the amount field is impossible; decimals work; empty input shows converted 0s, not NaN.
- [ ] Network tab: exactly one `/api/fiat` and one `/api/crypto` request per page load, none on base-currency switch.
- [ ] No React duplicate-key warnings with the live CMC list; drag-reorder still works and persists order.
- [ ] `VITE_API_URL` with and without trailing slash both work.
- [ ] 1 JPY → BTC shows ≥1 significant digit, never `0.0000`.
- [ ] Reload restores base currency, amount, and list.
- [ ] A saved-but-unresolvable code renders a "rate unavailable" row, removable.
- [ ] `npm run build`, `npm run lint` clean.
