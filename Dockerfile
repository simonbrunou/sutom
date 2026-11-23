# syntax=docker/dockerfile:1.29

FROM node:26-alpine AS builder
WORKDIR /app

# SvelteKit writes this origin into the canonical and social tags of every
# page. Left empty, the build still succeeds and those tags point at "/", so
# the image build stops here instead.
ARG PUBLIC_SITE_URL
RUN test -n "$PUBLIC_SITE_URL" || { echo "PUBLIC_SITE_URL is empty: set it as a build argument" >&2; exit 1; }

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Caddy 2.11.9 links golang.org/x/net v0.60.0 (CVE-2026-78661). This stage builds
# the builder image's Caddy version with x/net v0.62.0 or newer, and the runner
# stage checks that it matches the base image's. Remove this stage, and the COPY
# of /caddy and the `RUN test` below, once
# `docker run --rm caddy:2-alpine caddy build-info` lists x/net v0.62.0 or newer.
FROM caddy:2-builder-alpine AS caddy-builder
WORKDIR /src
COPY <<'EOF' main.go
package main

import (
	caddycmd "github.com/caddyserver/caddy/v2/cmd"

	_ "github.com/caddyserver/caddy/v2/modules/standard"
)

func main() { caddycmd.Main() }
EOF
RUN go mod init caddy \
  && go mod edit -require=github.com/caddyserver/caddy/v2@${CADDY_VERSION} -require=golang.org/x/net@v0.62.0 \
  && go mod tidy \
  && CGO_ENABLED=0 go build -trimpath -ldflags '-w -s' -tags nobadger,nomysql,nopgx -o /caddy . \
  && setcap cap_net_bind_service=+p /caddy

FROM caddy:2-alpine AS runner
COPY --from=caddy-builder /caddy /usr/bin/caddy
RUN test "$(caddy version | cut -d" " -f1)" = "$CADDY_VERSION"
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/build /app/build

EXPOSE 80
