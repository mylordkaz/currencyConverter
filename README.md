# currencyConverter

Fiat + crypto currency converter — *tsūka kansan* (通貨換算). Pick a base currency and amount, and see live conversions across a list of fiat currencies and cryptocurrencies you choose. The app is branded **Tsuuka** (通貨, "currency").

## Components

| Directory | Stack | What it is |
|-----------|-------|------------|
| `worker/` | Cloudflare Workers, TypeScript | Zero-cost, keyless rates API. Proxies + edge-caches fiat rates (fawazahmed0/exchange-api, CC0) and crypto rates (CoinPaprika). No API keys, no database, no attribution. |
| `frontend/` | React, Vite, Tailwind | Web app. Drag-to-reorder currency list, persisted in `localStorage`. |
| `mobile/` | Expo, React Native | iOS/Android app. Long-press drag reorder, swipe-to-delete, persisted in `AsyncStorage`. |

Conversion is done client-side: the worker serves USD-based rates, and each client computes cross-rates. Both clients share the same conversion logic (`src/lib/currency.ts` on web, `lib/currency.ts` on mobile — kept in sync by hand until a shared package exists).

The original Go backend (`archive/backend/`) is **retired** — see [`archive/README.md`](archive/README.md). The revival plan and the move to the worker live in [`docs/specs/`](docs/specs/README.md).

## Prerequisites

- Node.js LTS + npm
- A [Cloudflare](https://dash.cloudflare.com/sign-up) account (free plan) to deploy the worker
- For mobile: the [Expo](https://expo.dev) tooling (`npx expo`), plus Expo Go or a dev client on your device/emulator
- **No API keys** — both rate sources are keyless.

## Setup

### Worker (rates API)

```bash
cd worker
npm install
npx wrangler dev          # local dev server on http://localhost:8787
# deploy to production:
npx wrangler login        # one-time, opens browser
npx wrangler deploy       # prints your https://<name>.workers.dev URL
```

Endpoints: `GET /api/fiat?base=USD`, `GET /api/crypto`, `GET /healthz`.

### Frontend (web)

```bash
cd frontend
cp .env.example .env      # VITE_API_URL -> the worker (http://localhost:8787/ for local dev)
npm install
npm run dev               # Vite dev server (default :5173)
```

### Mobile

```bash
cd mobile
cp .env.example .env      # EXPO_PUBLIC_API_URL -> the worker (LAN IP for a real device)
npm install
npx expo start            # or `npx expo run:ios` for a native dev build
```

Native `ios/` and `android/` folders are not committed — Expo regenerates them via prebuild/CNG when needed.

## Repository layout

```
worker/         Cloudflare Worker rates API (the live backend)
frontend/       React + Vite web app
mobile/         Expo React Native app
archive/backend/ Retired Go API — preserved, not deployed (see archive/README.md)
docs/specs/     Specifications (start at docs/specs/README.md)
```
