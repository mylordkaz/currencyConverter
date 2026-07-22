# Spec 16: Visual Redesign — "Dark Terminal"

**Status:** done — implemented on both platforms and statically verified (mobile `tsc` + jest 22/22; web lint + build + vitest 22/22). Visual/device eyeball pending with the owner. Icons: fiat = flagcdn full-bleed, crypto = worker iconUrl; mono = Space Mono (mobile) / SF Mono stack (web). `lib/currency.ts` untouched.
**Priority:** P1 — phase 3 (design)
**Scope:** `mobile/**` (RN/twrnc) and `frontend/src/**` (Tailwind). No backend/worker changes.
**Depends on:** 12–14 (worker contract + client data layer)

Approved concept (v4). Interactive mockup is the visual source of truth:
`scratchpad/money-swap-redesign.html` → https://claude.ai/code/artifact/cc5c81da-bb45-4ded-88a8-8c38ee521208

## Direction

Dark **technical** rates instrument — blue / gray / black, **monospace**, calm (not pure black, no grid), rounded, with **full-bleed circular** flag & coin icons. Replaces the old blue-gradient + emoji + system-font look.

## Tokens

| Token | Hex | Use |
|---|---|---|
| `bg` | `#171C24` | app canvas (soft charcoal, not black) |
| `panel` | `#1F2732` | cards / ledger |
| `panel2` | `#232B37` | bottom sheet |
| `raise` | `#2A3340` | pills, icon backing |
| `line` | `#2F3947` | hairline borders/dividers |
| `line2` | `#3B4655` | stronger borders / fiat icon ring |
| `text` | `#EAEEF4` | primary |
| `dim` | `#9AA5B4` | secondary |
| `faint` | `#6A7688` | tertiary / labels |
| `blue` | `#3D7BFF` | accent (FAB, active, base chevron) |
| `blueBright` | `#6A9BFF` | accent hover / bright text |
| `blueDim` | `#1C2C4D` | accent-tinted backing |
| `blueSoft` | `rgba(61,123,255,.14)` | crypto tag bg |
| `blueLine` | `rgba(61,123,255,.42)` | crypto icon ring / glow |

Radii: cards 18, pills/999, small 13. Coin badge = circle (50%).

## Type

- **Mono** for wordmark, all labels (uppercase, letter-spaced), currency codes, and every number (tabular). Mobile: **Space Mono** (`assets/fonts/SpaceMono-Regular.ttf`, load via `useFonts`, family `SpaceMono`). Web: `ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Code", Menlo, monospace`.
- **System sans** (no explicit family on mobile; the web `--sans` stack) for coin full-names + running text — so it isn't wall-to-wall mono.
- Numbers always tabular (`fontVariantNumeric: tabular-nums` web; RN mono is inherently monospaced).

## Icons — full-bleed circular

A shared `CurrencyIcon` (mobile component / web component or inline):
- **Fiat:** circular, `overflow:hidden`, image covers the badge. Source: `https://flagcdn.com/w160/{cc}.png` where `cc = code.slice(0,2).toLowerCase()` (matches the existing emoji-flag trick; `EUR→eu` works on flagcdn). Thin **gray** ring (`line2`).
- **Crypto:** same circular treatment, source = the worker's `iconUrl` (already on `currency.flag`). Full brand color. Thin **blue** ring (`blueLine`).
- **Fallback:** on image error, show a neutral circle with the currency code (mono, `dim`).
- Do NOT change `lib/currency.ts` — derive the flag URL in the icon component from `code`; crypto keeps using `currency.flag` (iconUrl).

## Layout (both platforms)

1. **Header bar:** a blue rounded-square **⇄** mark + `MONEY SWAP` (mono, tracked) with `通貨 TERMINAL` sub-label; right: a `● LIVE` pill (pulsing blue dot). (Web wordmark stays "Tsukakan" or "MONEY SWAP" — keep each app's brand; both mono.)
2. **Meta line:** mono uppercase `USD BASE · N PAIRS · CC0 FEED · <updatedAt>`.
3. **Hero card** (panel): `AMOUNT` label + **base pill** (full-bleed flag + code + chevron) → big mono amount (currency symbol muted, value in `text`, blinking blue caret on web; input on mobile) → foot line (`Base · US Dollar` / `Updated <date>`).
4. **Ledger** (panel, hairline rows): each row = full-bleed icon, `CODE` (mono) + `Fiat`/`Crypto` tag chip (gray/blue), sans name, right-aligned mono converted amount + mono rate line. Crypto rows: blue tag + blue icon ring.
5. **FAB:** blue rounded-square `+`, subtle glow.
6. **Add sheet:** dark bottom sheet — grab handle, `ADD CURRENCY` mono title, `160 fiat · 26 coins` sub, search, pick rows (full-bleed icon + name + add/added button in blue).
7. **Rate-unavailable / error / empty states:** restyle to the dark tokens (muted row, red-ish `#ff6b7a` for errors on dark).

## Keep all behavior

Conversion math, reorder (mobile drag), swipe-to-delete, add/remove, persistence, split fiat/crypto error banner, worker data — unchanged. This is styling + the icon swap only.

## Acceptance

- [ ] Mobile: `npx tsc --noEmit` clean; app boots; every screen matches the mockup; flags + coins render full-bleed circular; gestures still work.
- [ ] Web: `npm run lint && npm run build` clean; matches the mockup.
- [ ] No emoji flags remain in the UI; no blue gradient; mono type throughout the data.
- [ ] `lib/currency.ts` untouched (mirror intact).
