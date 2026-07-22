# Spec 07: Frontend Dependency Upgrade (web)

**Status:** done
**Priority:** P1
**Scope:** `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tailwind.config.js`, `frontend/postcss.config.js`, `frontend/.eslintrc.cjs`, `frontend/tsconfig*.json`, `frontend/src/index.css`
**Depends on:** — (land before 08)

## Problem

Stack frozen mid-2024: React 18.3, Vite 5, Tailwind 3, ESLint 8 legacy config, TS 5.2, and the **archived** `react-beautiful-dnd` (Atlassian shut it down; broken under React 18 StrictMode and incompatible with React 19).

## Current state (evidence)

`frontend/package.json`: react `^18.3.1`, vite `^5.3.4`, tailwindcss `^3.4.7`, eslint `^8.57.0` with `.eslintrc.cjs` legacy format, typescript `^5.2.2`, `react-beautiful-dnd ^13.1.1` (+ its `@types`), and a stray `dotenv ^16.4.5` dependency (Vite handles env natively — dead weight).

## Required changes

Resolve all versions at execution time (`npm outdated`, registry). Known migration hazards are listed per item.

1. **React 19:** `react`, `react-dom`, `@types/react`, `@types/react-dom` → latest. Hazards: `ReactDOM.render` removed (project already uses `createRoot` — verify `src/main.tsx`), `React.FC` still fine, ref-as-prop changes don't affect this codebase.
2. **Drag-and-drop migration:** remove `react-beautiful-dnd` + `@types/react-beautiful-dnd`. Replace with **`@hello-pangea/dnd`** (maintained fork, near-drop-in: same `DragDropContext`/`Droppable`/`Draggable` API — mostly an import swap in `src/App.tsx`). Verify its React 19 support at execution time; if it lags, fall back to `@dnd-kit/core` + `@dnd-kit/sortable` (bigger rewrite of the list in `App.tsx:198-317`).
3. **Vite:** latest major (v7+ as of authoring). Hazards: Node 20.19+/22 required; `@vitejs/plugin-react` → latest alongside.
4. **Tailwind 4:** run `npx @tailwindcss/upgrade`. Expected outcome: `@import "tailwindcss";` replaces the three `@tailwind` directives in `src/index.css`, config moves CSS-first, and with Vite the preferred integration is the `@tailwindcss/vite` plugin (drop `postcss.config.js` + `autoprefixer` — built in now). Verify the gradient/utility classes in `App.tsx` render identically after migration.
5. **ESLint 9 flat config:** delete `.eslintrc.cjs`, create `eslint.config.js` using `typescript-eslint` (v8+ unified package), `eslint-plugin-react-hooks` (latest — v5+ supports flat config), `eslint-plugin-react-refresh`. Keep the `react-refresh/only-export-components` rule. Update the `lint` script (drop `--ext`/`--report-unused-disable-directives`; flat config handles both).
6. **TypeScript:** latest 5.x. Run `tsc -b` and fix any new strictness fallout.
7. **axios:** latest.
8. **Remove `dotenv`** from dependencies.
9. Fresh `package-lock.json`; `npm audit` — zero high/critical.

## Acceptance criteria

- [ ] `npm run build` and `npm run lint` pass clean.
- [ ] `npm outdated` empty for direct deps; `npm audit` no high/critical.
- [ ] App boots (`npm run dev`), styles intact (gradient background, rounded cards), StrictMode enabled in `main.tsx`, and drag-to-reorder works — including under StrictMode, which the old library failed.
- [ ] `react-beautiful-dnd`, `dotenv`, `postcss.config.js` (if Tailwind-Vite plugin route taken), `.eslintrc.cjs` all gone.

## Out of scope

Behavioral fixes (spec 08). Keep this PR mechanical: upgrades + minimum code needed to compile/run.
