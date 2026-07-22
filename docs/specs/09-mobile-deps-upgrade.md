# Spec 09: Mobile Dependency Upgrade (Expo)

**Status:** done
**Priority:** P1
**Scope:** `mobile/package.json`, `mobile/app.json`, `mobile/eas.json`, config files under `mobile/`
**Depends on:** 01 (consolidation done: `mobile/` now contains the former `mobile_V1` codebase, native folders deleted)

> All references below are to the **post-consolidation** `mobile/` folder — i.e., the former `mobile_V1` code. If spec 01 hasn't landed, stop and do it first.

## Problem

App pinned to Expo SDK 51 / RN 0.74 / React 18.2 (mid-2024), configured for the JSC engine, with committed-native-folder-era config. Multiple SDK majors behind; old SDKs lose Expo Go support and store submission eligibility.

## Current state (evidence)

- `package.json`: `expo ^51.0.32`, `react-native 0.74.5`, `react 18.2.0`, `expo-router ~3.5.x`, `jest-expo ~51`, `typescript ~5.3`.
- `app.json`: `"jsEngine": "jsc"` — JSC is no longer supported on recent Expo SDKs (Hermes is the only bundled engine); this key must go. Also `"entryPoint": "./app/index.tsx"` — ignored/deprecated with expo-router (entry comes from `package.json` `main: "expo-router/entry"`); remove.
- `react-native-draggable-flatlist` — **used** (`components/CurrencyList.tsx` — long-press drag reorder). Do NOT remove. It depends on `react-native-gesture-handler` + `react-native-reanimated`.
- Font setup duplicated: `app.json` embeds Delius via the `expo-font` plugin **and** `app/index.tsx` loads it at runtime with `useFonts`. Plugin-embedded fonts are available natively; the runtime `useFonts` + `if (!fontsLoaded) return null` gate is redundant once embedded — remove the runtime path.
- Check at execution: `@expo/ngrok`, `@types/react-native` (deprecated — RN ships own types), unused Expo modules (`expo-web-browser`, direct `@react-navigation/native` — router manages navigation; verify imports before removing).

## Required changes

1. **Upgrade to the latest Expo SDK** at execution time (SDK 54+ era):
   - `npx expo install expo@latest`, then `npx expo install --fix` (aligns every `expo-*`, `react-native`, `react`, `react-native-*`, `jest-expo` to the SDK's expected versions).
   - Crossing SDK 52+: New Architecture becomes default. Verify new-arch compatibility of the gesture stack the reorder feature sits on: `react-native-draggable-flatlist` (v4.x), `react-native-gesture-handler`, `react-native-reanimated` at the versions `--fix` installs. If `draggable-flatlist` turns out abandoned/incompatible at execution time, migrate `CurrencyList` to a maintained equivalent (e.g. `react-native-reorderable-list`) — keep long-press drag + swipe-to-delete behavior identical.
   - `expo-router` v3 → current: routes here are trivial (`index.tsx`, `_layout.tsx` with `GestureHandlerRootView`), but check layout API changes per major.
   - Consult the Expo SDK upgrade changelogs for each major crossed. If the incremental path fights back, fallback: fresh `create-expo-app` template on the target SDK, port `app/`, `components/`, `hooks/`, `constants/`, `assets/fonts/`, `eas.json`, and the `app.json` identity block (slug, projectId, bundleIdentifier, package).
2. **app.json cleanup:** remove `"jsEngine": "jsc"` (Hermes default) and `"entryPoint"`. Keep slug/projectId/bundle ids untouched (spec 01 §A5).
3. **Font simplification:** keep the `expo-font` config plugin embedding Delius; delete the `useFonts` runtime load and the `fontsLoaded` gate in `app/index.tsx`.
4. **Dependency cleanup:** remove `@types/react-native`; move `@expo/ngrok` out of `dependencies` (dev tool) or drop it; remove any Expo module with zero imports (verify with grep, not assumption).
5. **React 19 & types** arrive with the SDK; align `@types/react`, bump `typescript` to latest 5.x.
6. **`SafeAreaView` deprecation:** `app/index.tsx` imports `SafeAreaView` from `react-native` (deprecated in recent RN). Switch to `react-native-safe-area-context` (already an SDK dependency).
7. **eas.json:** update `cli.version` constraint and profiles to current EAS schema; native folders are gone (spec 01), so builds run CNG/prebuild — confirm `eas build --platform ios --profile preview` config parses (`eas config`).

## Acceptance criteria

- [ ] `npx expo-doctor` passes with no errors.
- [ ] `npx tsc --noEmit` clean.
- [ ] `npm test` passes (jest-expo).
- [ ] App boots in Expo Go / dev client on the new SDK: gradient + Delius "Money Swap" title render, currency list loads, **long-press drag reorder works, swipe-to-delete works** (the two features that must survive the gesture-stack upgrade), selector + add modals open, keyboard dismiss works.
- [ ] `app.json` has no `jsEngine`, no `entryPoint`; slug + projectId unchanged.
- [ ] No `SafeAreaView` import from `react-native`; no `useFonts` in `app/index.tsx`.
- [ ] `@types/react-native` gone; `@expo/ngrok` not in `dependencies`.

## Out of scope

Behavioral fixes (spec 10). Actual store submission.
