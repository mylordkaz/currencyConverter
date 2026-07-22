# Spec 01: Repo Hygiene & Mobile Consolidation

**Status:** done
**Priority:** P2 (quick win, do first)
**Scope:** repo root, `mobile/`, `mobile_V1/`, `README.md`, env examples
**Depends on:** —

## Problem

Two mobile apps coexist, the folder names lie about which one is current, and the repo carries committed OS junk, no root `.gitignore`, no env documentation, and a two-line README.

## The two-mobile-apps situation (git archaeology)

Do not assume from the names. Verified history:

- `8f586f1` ("first commit mobile version") added **both** folders at once — they were developed side by side before being committed.
- `mobile/` — last real change **2024-09-19**. Commit `f4babba` "fix env import similar to v1" shows it was copying fixes *from* V1. It is an abandoned, stripped-down rewrite: no reorder, no remove-currency UI, no custom font, no build config.
- `mobile_V1/` — received the iOS/Android build setup (`af669d6` "ios build", 2024-09-21: EAS config, native folders, bundle id `com.mylord.tsukakan`) and the **newest feature commit in the whole repo** (`4aca63b`, 2025-02-15: Delius font, "Money Swap" title). It has swipe-to-delete, long-press drag reorder (`react-native-draggable-flatlist`), keyboard-dismiss handling, and the EAS project link (projectId `62f35feb-dd5c-4fda-8b49-d5e1e6c7bb4e`).

**Conclusion: `mobile_V1` is the real app; `mobile/` is the dead one.** All mobile specs (09, 10) target the V1 codebase after the consolidation below.

## Required changes

### A. Mobile consolidation (order matters)

1. `git rm -r mobile` — delete the abandoned rewrite. Nothing in it is unique; V1 is a superset (verified by diff: `mobile/` has zero features V1 lacks).
2. `git mv mobile_V1 mobile` — the surviving app takes the clean name.
3. Inside the renamed folder: `git rm -r ios android` — these are SDK-51 prebuild artifacts committed during the 2024 "ios build" work. Modern Expo CNG regenerates them (`npx expo prebuild`); they will be stale and harmful after the SDK upgrade (spec 09).
4. Restore a standard Expo `.gitignore` in the app folder (the "ios build" commit weakened it): must ignore `/ios`, `/android`, `.expo/`, `node_modules/`.
5. `app.json`: **keep** `slug: "mobile_V1"` and the `extra.eas.projectId` — the slug is bound to the existing EAS project; renaming it silently detaches builds. Renaming the slug = owner decision, new EAS project (flagged in specs README). The display `name` may be changed freely.
6. Keep `eas.json`, `metro.config.js`, `index.js`, `babel.config.js` from V1 as-is (spec 09 updates them for the new SDK).

### B. Hygiene

7. `git rm --cached .DS_Store` (committed at repo root).
8. Add root `.gitignore`: `.DS_Store`, `*.log`, `.env`, `.env.*`, `!.env.example`, `node_modules/`, `dist/`.
9. Add env examples (placeholders only, never real keys):
   - `backend/.env.example`:
     ```
     FIAT_API_URL=https://v6.exchangerate-api.com
     FIAT_API_KEY=your-exchangerate-api-key
     CRYPTO_API_URL=https://pro-api.coinmarketcap.com
     CRYPTO_API_KEY=your-coinmarketcap-key
     FRONT_URL=http://localhost:5173
     PORT=8080
     ```
   - `frontend/.env.example`: `VITE_API_URL=http://localhost:8080/`
   - `mobile/.env.example`: `EXPO_PUBLIC_API_URL=http://localhost:8080/`
10. Rewrite `README.md`: what the app is (fiat + crypto converter; web is branded "Tsukakan", mobile "Money Swap" — see specs README "Manual actions" for the branding decision), the three components (Go backend, React web, Expo mobile), prerequisites, per-component setup, pointer to `docs/specs/`.

## Acceptance criteria

- [ ] Exactly one mobile folder (`mobile/`), containing the V1 codebase: `grep -r "DraggableFlatList" mobile/components/` hits; `grep "Delius" mobile/app/index.tsx` hits.
- [ ] `git log --follow mobile/package.json` shows V1 history (rename tracked).
- [ ] No `ios/` or `android/` directories tracked: `git ls-files mobile/ | grep -E "^mobile/(ios|android)/"` empty.
- [ ] `app.json` still has slug `mobile_V1` and the EAS projectId.
- [ ] `git ls-files | grep DS_Store` empty; root `.gitignore` works (`touch .DS_Store && git status` shows nothing).
- [ ] All three `.env.example` files exist, no real secrets.
- [ ] README documents setup for all three components.
