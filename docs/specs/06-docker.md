# Spec 06: Docker Build & Compose

**Status:** done
**Priority:** P1
**Scope:** `backend/dockerfile`, `backend/docker-compose.yml`, `backend/.dockerignore`
**Depends on:** 04 (healthz), 05 (Go version)

## Problem

Single-stage build on the full `golang` image: ~1GB runtime image, runs as root, no dependency layer caching, and the compose file is dated.

## Current state (evidence)

- `dockerfile:1-7` — `FROM golang:1.22.5`, `COPY . .` before any dependency download (any source change re-downloads modules), binary runs as root in the full toolchain image.
- `docker-compose.yml:1` — obsolete `version: '3'` key; no restart policy; no healthcheck.
- `.dockerignore` exists — verify it excludes `.env` (secrets must reach the container via `env_file`/environment at runtime, never be baked into the image).

## Required changes

1. **Multi-stage Dockerfile** (rename to `Dockerfile`, capital D — convention and case-sensitive tooling):
   ```dockerfile
   FROM golang:<latest-stable>-alpine AS builder
   WORKDIR /app
   COPY go.mod go.sum ./
   RUN go mod download
   COPY . .
   RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /server ./cmd/server

   FROM gcr.io/distroless/static-debian12:nonroot
   COPY --from=builder /server /server
   EXPOSE 8080
   USER nonroot
   ENTRYPOINT ["/server"]
   ```
   Match the builder tag to the Go version from spec 05.
2. **`.dockerignore`:** ensure it contains at least `.env`, `.env.*`, `tmp/`, `.git`, `*.md`, `.air.toml`.
3. **Compose:** drop the `version:` key; keep `env_file: .env`; add `restart: unless-stopped`; add a healthcheck hitting `/healthz`. Note: distroless has no shell/curl — implement the healthcheck either via `wget`-capable base (alpine variant) **or** compose-level check from the host, **or** skip the container-internal healthcheck and document why. Pick one, don't cargo-cult a `curl` line that can't run.
4. **Airtable note:** `.air.toml` (hot reload) is dev-only; unaffected.

## Acceptance criteria

- [ ] `docker build` succeeds; final image < 30MB (`docker images`).
- [ ] `docker run --env-file .env -p 8080:8080 <img>` serves `/healthz` and `/api/fiat`.
- [ ] `docker inspect` shows non-root user.
- [ ] Rebuild after touching a `.go` file does **not** re-run `go mod download` (layer cache hit).
- [ ] `docker compose up` works with no warnings about the `version` key; `.env` absent from image filesystem (`docker run <img> ls /` — no shell in distroless, so verify via `docker export | tar -t` or build-stage inspection).
