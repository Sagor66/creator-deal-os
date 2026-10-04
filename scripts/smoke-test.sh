#!/usr/bin/env bash
# Post-deploy smoke test (docs/design/deployment.md §4). Used by the deploy
# workflow after every environment, and by CI against locally built images.
#
#   scripts/smoke-test.sh <web-url> <api-url> <expected-version>
#
# Retries absorb cold starts (services scale to zero). Exits non-zero on the
# first failed check, naming it.
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "usage: $0 <web-url> <api-url> <expected-version>" >&2
  exit 2
fi
web="${1%/}"
api="${2%/}"
version="$3"

body="$(mktemp)"
headers="$(mktemp)"
trap 'rm -f "$body" "$headers"' EXIT

# GET <url> <expected-status>; leaves the body and headers in the temp files.
fetch() {
  local url="$1" expected="$2" status
  status="$(curl --silent --show-error --location --max-time 20 \
    --retry 6 --retry-delay 5 --retry-all-errors \
    --dump-header "$headers" --output "$body" --write-out '%{http_code}' "$url")" || true
  if [[ "$status" != "$expected" ]]; then
    echo "FAIL $url: expected HTTP $expected, got ${status:-no response}" >&2
    head -c 500 "$body" >&2 || true
    echo >&2
    exit 1
  fi
}

check() {
  local description="$1" pattern="$2" file="$3"
  if grep -Eqi -- "$pattern" "$file"; then
    echo "ok   $description"
  else
    echo "FAIL $description (no match for: $pattern)" >&2
    head -c 500 "$file" >&2 || true
    echo >&2
    exit 1
  fi
}

fetch "$api/health" 200
check "api is live" '"status":"ok"' "$body"

fetch "$api/health/ready" 200
check "api is ready (database reachable)" '"status":"ready"' "$body"

fetch "$api/meta" 200
check "api runs version $version" "\"version\":\"$version\"" "$body"

fetch "$web/api/health" 200
check "web is live" '"status":"ok"' "$body"

fetch "$web/" 200
check "web reaches the api and sees version $version" "data-version=\"$version\"" "$body"
check "web reports the api ready" 'data-readiness="ready"' "$body"
check "web sends HSTS" '^strict-transport-security: max-age=[0-9]+' "$headers"

# Source maps live in Sentry, never on the site (docs/design/observability.md §5):
# take a real JS chunk from the page; it must load, and its .map must not.
chunk="$(grep -oE '/_next/static/[^"]+[.]js' "$body" | head -1 || true)"
if [[ -z "$chunk" ]]; then
  echo "FAIL no /_next/static JS chunk found in the page" >&2
  exit 1
fi
fetch "$web$chunk" 200
echo "ok   web serves its JS ($chunk)"
fetch "$web$chunk.map" 404
echo "ok   web does not serve source maps ($chunk.map → 404)"

echo "smoke test passed: web=$web api=$api version=$version"
