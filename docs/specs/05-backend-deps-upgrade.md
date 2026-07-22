# Spec 05: Backend Dependency Upgrade

**Status:** done
**Priority:** P1
**Scope:** `backend/go.mod`, `backend/go.sum`
**Depends on:** — (land before 03/04 so new deps are available)

## Problem

Project pinned to Go 1.22.5 (June 2024) and year-old module versions. Revival wants current toolchain and patched deps.

## Current state (evidence)

- `go.mod:3` — `go 1.22.5`.
- `gin-gonic/gin v1.10.0`; `gin-contrib/cors v1.7.2` (indirect); `joho/godotenv v1.5.1` (indirect but imported by `main.go` — should be direct); `patrickmn/go-cache v2.1.0+incompatible` (indirect but imported by services — should be direct).

## Required changes

1. **Go version:** set `go.mod` to the latest stable Go at execution time (check `go version` / go.dev/dl; as of authoring this is the 1.26 line). Update the Docker builder image to match (coordinates with spec 06).
2. **Upgrade all modules:** `go get -u ./...` then `go mod tidy`. Verify `gin` lands on its latest release and read its changelog for breaking changes (historically none across v1.x minor bumps).
3. **Fix direct/indirect classification:** `go mod tidy` will promote `godotenv`, `go-cache`, and (after spec 04) `gin-contrib/cors` to the direct block since they're imported.
4. **Add** `golang.org/x/sync` (for spec 03's singleflight).
5. **`patrickmn/go-cache` decision: keep.** It's unmaintained (archived 2019) but tiny, stable, and race-free for this usage. Swapping caches is churn without payoff at this scale. Record the decision here; revisit only if a real defect surfaces.

## Acceptance criteria

- [ ] `go.mod` declares the latest stable Go; `go build ./...`, `go vet ./...`, `go test ./...` all pass on that toolchain.
- [ ] `go list -u -m all` shows no available updates for direct dependencies.
- [ ] `godotenv`, `go-cache`, `cors`, `x/sync` listed as direct requirements (no `// indirect` marker).
- [ ] Server boots and serves `/api/fiat` + `/api/crypto` against live upstreams (or the httptest doubles from spec 11).
