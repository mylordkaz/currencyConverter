# Spec 10: Mobile Fixes

**Status:** done
**Priority:** P1
**Scope:** `mobile/app/**`, `mobile/components/**`, `mobile/hooks/**`, `mobile/constants/**`, `mobile/lib/**` (new)
**Depends on:** 01 (consolidation), 09 (implement against the upgraded SDK); mirrors several fixes from 08

> References are to the **post-consolidation** `mobile/` (former `mobile_V1` code). Line numbers cited from the pre-rename `mobile_V1/` files at commit `bb7cc4e`; expect drift after spec 09.

Good news from the consolidation: swipe-to-delete (`CurrencyList.tsx:125-134,144`) and long-press drag reorder (`CurrencyList.tsx:191-199`) **already exist** — this spec fixes logic, not missing features.

## Current state (evidence) & required changes

1. **One failed source blanks everything.** `hooks/useCurrencies.ts` sets a single shared `error` (in both fetchers' catch blocks); `components/CurrencyList.tsx:178-180` early-returns the error instead of the list. Crypto API down → user's fiat list hidden too.
   - Track `fiatError` and `cryptoError` separately in the hook.
   - `CurrencyList` renders whatever data exists; dismissible inline banner names the failed source. Full error state only when both failed and nothing to show.

2. **Save-before-load race.** `app/index.tsx` — on mount, the save effect fires immediately with the default `['USD']` while `loadSelectedCurrencies` is still awaiting AsyncStorage. Works today only because AsyncStorage happens to FIFO the getItem before the setItem. Add an `isLoaded` flag set by the load; save effect returns early until then.

3. **Misused `useTransition`.** `hooks/useCurrencies.ts` — `startTransition` wraps plain async state sets (adds nothing); `isPending` unused. Remove; direct `setState`.

4. **Dead ordering computation + duplicated source of truth.**
   - `app/index.tsx:25,29` — `sortCurrencies` is destructured and `orderedCurrencies` computed, but **never used** (CurrencyList orders internally). Delete the call site and the `sortCurrencies` helper in the hook.
   - `CurrencyList.tsx:40-50` — props-derived `orderedCurrencies` (useMemo) is mirrored into local `data` state via `useEffect` just so `DraggableFlatList` can set it on drag. Two sources of truth; parent state round-trips back through the effect. Simplify: render from the memoized props derivation; on `onDragEnd`, call `onReorderCurrencies(newOrder)` only — no local copy. (If the list visibly flickers on drop pending the parent update, keep the local state but document it; measure first.)

5. **Key collisions.** `keyExtractor={(item) => item.code}` in `CurrencyList.tsx:197`, `CurrencySelector.tsx:145`, `AddCurrencyModal.tsx:86`. CMC listings can contain duplicate ticker symbols, and a crypto ticker can collide with a fiat code — `currencies.find(c => c.code === ...)` then resolves the wrong asset. Same fix as spec 08 §3: add `id` (`fiat-USD` / `crypto-<cmc id>`) to the `Currency` type (`constants/type.ts`), dedupe cryptos by symbol on ingest in the hook, key on `id`. Persisted selections keep storing codes (backward compatible).

6. **Precision loss.** `CurrencyList.tsx:77` (`toFixed(4)` description) and `:163` (`toFixed(2)` amount) — 1 JPY in BTC renders `0.0000`. Same fix as spec 08 §5: `formatAmount` helper (`Intl.NumberFormat`, 2 decimals ≥ 1, 4 significant digits < 1).

7. **Division-by-zero guard** in `convertCurrency` / `getDescriptionRate` (`CurrencyList.tsx:52-123`) — rate ≤ 0 → return null instead of Infinity. Same as spec 08 §6.

8. **Extract `mobile/lib/currency.ts`.** Move `convertCurrency`, `getDescriptionRate`, `getDescription`, `getFlagEmoji` (currently in `hooks/useCurrencies.ts:20-27`), `formatAmount`, and the currency-info map. `CurrencyList.tsx` becomes render-only. Keep **content-identical** to `frontend/src/lib/currency.ts` (spec 08 §7) apart from type-import lines — header comment in both must state they mirror each other (shared package out of scope). Do not change the conversion formulas — all four fiat/crypto combinations are verified correct.

9. **Per-item lookups in renderItem.** `CurrencyList.tsx:136` — `currencies.find(...)` for the base currency runs per row per render, with `baseCurrencyData!` non-null assertions (`:139,166`). Hoist the lookup once above the list (a guard already exists at `:182-186`); pass it in; drop the `!`.

10. **URL join + logging.** `hooks/useCurrencies.ts` — `${API_URL}api/crypto` requires the env var to end with `/`; add the same join helper as spec 08 §4, clear error if `EXPO_PUBLIC_API_URL` unset. Delete the request/response `console.log`s; keep `console.error`s.

11. **Persist base currency.** Only the list is saved; `selectedCurrency` resets to USD every launch. Persist alongside `selectedCurrencies` (respect the `isLoaded` guard from §2).

12. **Expand fiat coverage.** `hooks/useCurrencies.ts:5-18` — 10-currency hardcoded map. Apply spec 08 §9 (same ~30 currencies, explicit flag overrides where the two-letter-prefix trick fails). Must end up identical to the web map (lives in the mirrored `lib/currency.ts`).

13. **Missing-currency row.** `CurrencyList.tsx:40-44` — a saved code with no live match (crypto fell out of CMC top 100) is silently dropped by `.filter(Boolean)`. Render a muted "rate unavailable" row instead; swipe-to-delete already provides removal.

14. **Dead code sweep.** Unused `onAddCurrency`/`availableCurrencies` props on `CurrencyList` (add-flow lives in `app/index.tsx`'s FAB + `AddCurrencyModal`); commented-out close button in `CurrencySelector.tsx`; any leftover commented blocks.

## Acceptance criteria

- [ ] Kill crypto upstream only: fiat rows render + banner. Kill both: full error state.
- [ ] Fresh install: default `USD`; relaunch after adding/reordering/changing base: list, order, and base currency restored. No write of defaults before the read completes.
- [ ] No duplicate-key warnings with live CMC data; drag reorder and swipe-to-delete still work after the §4 simplification.
- [ ] Tiny crypto rates show significant digits, never `0.0000`.
- [ ] A saved-but-unresolvable code shows "rate unavailable" and can be swiped away.
- [ ] `diff <(tail -n +N frontend/src/lib/currency.ts) <(tail -n +N mobile/lib/currency.ts)` — logic identical modulo import lines.
- [ ] `npx tsc --noEmit` clean; `console.log` gone from hooks/components; app boots with all gestures working.
