#!/usr/bin/env bash
# Migrate, deploy and smoke-test one environment on Cloud Run.
# Called by .github/workflows/deploy.yml for staging and production; runnable
# by hand with the same variables (docs/runbooks/deploy-and-rollback.md).
#
# Required: PROJECT_ID, REGION, API_IMAGE, WEB_IMAGE (by digest), APP_VERSION
# Optional: PUBLIC_WEB_URL, PUBLIC_API_URL (custom domains, used by the smoke test)
#
# Order matters (docs/design/deployment.md §4):
#   1. migrate (old api still serving; migrations are expand/contract)
#   2. api     (new revision gets traffic only after /health/ready passes)
#   3. web     (pointed at the api's URL)
#   4. smoke test
# Any failure stops the script, and whatever already serves keeps serving.
set -euo pipefail

: "${PROJECT_ID:?}" "${REGION:?}" "${API_IMAGE:?}" "${WEB_IMAGE:?}" "${APP_VERSION:?}"
for image in "$API_IMAGE" "$WEB_IMAGE"; do
  if [[ "$image" != *@sha256:* ]]; then
    echo "::error::deploy by digest only, got: $image" >&2
    exit 1
  fi
done

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$here/../.." && pwd)"
rendered="$(mktemp -d)"
trap 'rm -rf "$rendered"' EXIT

# Fill the ${...} placeholders this script owns, and nothing else.
render() {
  sed -e "s|\${PROJECT_ID}|${PROJECT_ID}|g" \
    -e "s|\${REGION}|${REGION}|g" \
    -e "s|\${API_IMAGE}|${API_IMAGE}|g" \
    -e "s|\${WEB_IMAGE}|${WEB_IMAGE}|g" \
    -e "s|\${APP_VERSION}|${APP_VERSION}|g" \
    -e "s|\${API_URL}|${API_URL:-}|g" \
    "$here/$1" >"$rendered/$1"
  if grep -nE '^[^#]*[$][{]' "$rendered/$1"; then
    echo "::error::unfilled placeholder in $1" >&2
    exit 1
  fi
}

run() { gcloud run "$@" --project "$PROJECT_ID" --region "$REGION" --quiet; }

output() {
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then echo "$1=$2" >>"$GITHUB_OUTPUT"; fi
}

echo "::group::1. Migrate (job 'migrate', image $API_IMAGE)"
render migrate.job.yaml
run jobs replace "$rendered/migrate.job.yaml"
run jobs execute migrate --wait
echo "::endgroup::"

echo "::group::2. Deploy api (traffic moves only once /health/ready passes)"
render api.service.yaml
run services replace "$rendered/api.service.yaml"
run services add-iam-policy-binding api --member=allUsers --role=roles/run.invoker >/dev/null
API_URL="$(run services describe api --format='value(status.url)')"
echo "api: $API_URL"
echo "::endgroup::"

echo "::group::3. Deploy web"
render web.service.yaml
run services replace "$rendered/web.service.yaml"
run services add-iam-policy-binding web --member=allUsers --role=roles/run.invoker >/dev/null
WEB_URL="$(run services describe web --format='value(status.url)')"
echo "web: $WEB_URL"
echo "::endgroup::"

output api-url "${PUBLIC_API_URL:-$API_URL}"
output web-url "${PUBLIC_WEB_URL:-$WEB_URL}"

echo "::group::4. Smoke test"
"$repo_root/scripts/smoke-test.sh" "${PUBLIC_WEB_URL:-$WEB_URL}" "${PUBLIC_API_URL:-$API_URL}" "$APP_VERSION"
echo "::endgroup::"
