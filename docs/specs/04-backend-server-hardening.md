# Spec 04: Backend Server Hardening

**Status:** done
**Priority:** P1
**Scope:** `backend/cmd/server/main.go`, `backend/config/config.go`
**Depends on:** 02

## Problem

The server runs with no timeouts (slowloris-exposed), no graceful shutdown, gin in debug mode, and CORS disabled — so any browser frontend on another origin is blocked.

## Current state (evidence)

- `main.go:42` — bare `http.ListenAndServe(":"+cfg.Port, r)`: no `ReadHeaderTimeout`, `ReadTimeout`, `WriteTimeout`, or `IdleTimeout`; no shutdown handling.
- `main.go:32` — `gin.Default()` with no mode set → debug mode + banner in production.
- `main.go:34-36` — CORS middleware commented out; `gin-contrib/cors` already in `go.mod` (currently as indirect).
- `config.go:28-31` — `FRONT_URL` loading commented out; `Config.FrontURL` never populated.

## Required changes

1. **Real `http.Server`:**
   ```go
   srv := &http.Server{
       Addr:              ":" + cfg.Port,
       Handler:           r,
       ReadHeaderTimeout: 5 * time.Second,
       ReadTimeout:       10 * time.Second,
       WriteTimeout:      20 * time.Second, // > upstream client timeout (10s) + margin
       IdleTimeout:       120 * time.Second,
   }
   ```
2. **Graceful shutdown:** `signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)`; run `srv.ListenAndServe()` in a goroutine; on signal, `srv.Shutdown(ctx)` with a 10s timeout. `http.ErrServerClosed` is not an error.
3. **Gin mode:** respect `GIN_MODE` if set; otherwise default to `gin.ReleaseMode`. Use `gin.New()` with `gin.Recovery()` and `gin.Logger()` explicitly (same behavior as `Default`, but intentional).
4. **Enable CORS:** restore `FRONT_URL` in `config.Load()` — optional env, comma-separated origins, defaulting to `http://localhost:5173` (Vite dev) when unset. Configure `gin-contrib/cors` with those exact origins (no wildcard), methods `GET`, and default headers. Move `gin-contrib/cors` to a direct dependency (`go mod tidy` after import).
5. **Health endpoint:** `GET /healthz` → `200 {"status":"ok"}`, registered before CORS-restricted groups is fine (no credentials involved). Used by Docker healthcheck in spec 06.

## Acceptance criteria

- [ ] `curl -s localhost:8080/healthz` → `{"status":"ok"}`.
- [ ] Browser fetch from `http://localhost:5173` succeeds (correct `Access-Control-Allow-Origin` echo); fetch from an unlisted origin gets no CORS allow header.
- [ ] `kill -TERM <pid>` while a request is in flight: in-flight request completes, process exits 0 within 10s.
- [ ] No gin debug banner in logs when `GIN_MODE` unset.
- [ ] `go vet ./...` clean.
