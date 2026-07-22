# Spec 02: Backend Security

**Status:** done
**Priority:** P0 — fix before anything else ships
**Scope:** `backend/internal/api/handlers.go`, `backend/internal/service/currency_service.go`, `backend/internal/service/crypto_service.go`
**Depends on:** —

## Problem

Three issues: the fiat API key leaks to HTTP clients through error messages, the `base` query param is passed unvalidated into the upstream URL, and raw upstream responses are dumped to stdout.

## Current state (evidence)

1. **API key leak.** `currency_service.go:51` builds the upstream URL with the key in the path: `%s/v6/%s/latest/%s`. When `s.client.Do(req)` fails (timeout, DNS, refused), Go's `*url.Error` message contains the full URL — including the key. `currency_service.go:60` wraps it with `%w`, and `handlers.go:28` returns `err.Error()` verbatim to the client as JSON. Any visitor gets the key from a 500 body whenever the upstream is unreachable.
2. **Unvalidated `base`.** `handlers.go:24` reads `c.DefaultQuery("base", "USD")` and `currency_service.go:39,51` interpolates it into both the cache key and the upstream URL path. `?base=USD/../..` manipulates the upstream path; every unique value triggers a paid upstream call and a new cache entry (quota burn, unbounded cache).
3. **Debug dumps.** `currency_service.go:72-73` prints the full raw JSON body on every cache miss; `crypto_service.go:65` prints an orphaned `"Raw JSON response: "` label.

## Required changes

1. **Never return internal error text to clients.** In both handlers:
   - Log the full error server-side (`log.Printf` is fine at this stage).
   - Respond with a fixed, generic message: upstream/fetch failures → `502 {"error": "exchange rate provider unavailable"}` (fiat) / `502 {"error": "crypto rate provider unavailable"}`; anything else → `500 {"error": "internal error"}`.
   - Distinguish upstream vs. internal via sentinel errors exported from the service package (e.g., `service.ErrUpstream`) checked with `errors.Is`.
2. **Redact the key from error chains at the source.** In `FetchCurrencies`, when wrapping any error that can embed the URL (request creation, `client.Do`), replace the key: wrap with a sanitized message, e.g. `fmt.Errorf("%w: %s", ErrUpstream, strings.ReplaceAll(err.Error(), s.apiKey, "[redacted]"))`. Defense in depth: even if a future handler echoes errors, the key is not in the string. Apply the same helper in the crypto service (its key is in a header, so exposure is unlikely, but the helper is cheap).
3. **Validate `base` in the handler** before calling the service:
   - Normalize: `strings.ToUpper(strings.TrimSpace(base))`.
   - Must match `^[A-Z]{3}$`; otherwise `400 {"error": "invalid base currency code"}`.
   - Pass only the normalized value to the service.
4. **Delete the debug prints** at `currency_service.go:72-73` and `crypto_service.go:64-66`.

## Acceptance criteria

- [ ] With an unreachable upstream (point `FIAT_API_URL` at a dead host), `GET /api/fiat` returns 502 and the response body does **not** contain the API key or the upstream URL. Same check for `/api/crypto`.
- [ ] `GET /api/fiat?base=usd` works (normalized to USD). `?base=USD/../x`, `?base=DOLLARS`, `?base=U$` all return 400 without any upstream call being made.
- [ ] `grep -rn "Println" backend/internal/service/` returns nothing.
- [ ] Server logs still contain enough detail to diagnose upstream failures (redacted URL is fine, status codes preserved).
- [ ] Reminder recorded for the owner: rotate the ExchangeRate-API key after this lands (see specs README, "Manual actions").

## Out of scope

Rate limiting per client IP (nice-to-have; note under Discovered if wanted).
