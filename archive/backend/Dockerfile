# syntax=docker/dockerfile:1

# ---- build stage ----
# Match the builder to the Go toolchain declared in go.mod (spec 05).
FROM golang:1.26.3-alpine AS builder
WORKDIR /app

# Download modules first so this layer is cached until go.mod/go.sum change.
COPY go.mod go.sum ./
RUN go mod download

# Then bring in the source and build a static, stripped binary.
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /server ./cmd/server

# ---- runtime stage ----
# Distroless static + nonroot: no shell, no package manager, minimal attack surface.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /server /server
EXPOSE 8080
USER nonroot
ENTRYPOINT ["/server"]
