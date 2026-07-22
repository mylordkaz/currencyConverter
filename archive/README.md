# Archive

Retired components kept for reference. **Nothing here is deployed, built in CI, or used by the apps.** Code is preserved (not deleted) in case it's ever wanted back.

## `backend/` — original Go rates API

The Go + Gin backend that proxied ExchangeRate-API (fiat) and CoinMarketCap (crypto) with server-side caching. It was hardened in phase 1 (security, reliability, server hardening, Docker — see `docs/specs/02`–`06`) and then **retired in phase 2** when a zero-cost, keyless [Cloudflare Worker](../worker/) took over both endpoints (`docs/specs/12`–`15`).

Why retired, not kept live:
- The Worker serves the same two endpoints from keyless, attribution-free, public-domain sources — no API keys, no hosting cost, no owner-tied quotas.
- Keeping a second implementation live meant hosting cost (the only real cost in the system) and two codebases to keep in sync.

It still runs, unchanged, from here:

```bash
cd archive/backend
cp .env.example .env      # needs real ExchangeRate-API + CoinMarketCap keys
go run ./cmd/server       # :8080
```

Note: the current web/mobile apps target the Worker's response shape (`docs/specs/12`), which differs from this backend's CoinMarketCap-shaped `/api/crypto`. To point a client back at this backend you'd also revert specs 13/14. Full history is in git regardless.
