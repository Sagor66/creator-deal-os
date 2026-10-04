#!/usr/bin/env bash
# Adds a new version of one of the app's secrets without the value touching the
# screen, the shell history, a file or a chat:
#
#   PROJECT_ID=<project> infra/gcp/set-secret.sh api-database-url       # prompts, input hidden
#   PROJECT_ID=<project> infra/gcp/set-secret.sh database-ca-cert < ca.pem
#
# Running instances keep the value they started with; the next deploy (or a new
# instance) picks up the new version. Rotation steps: docs/runbooks/deploy-and-rollback.md.
set -euo pipefail

name="${1:?usage: PROJECT_ID=<project> $0 <api-database-url|migrate-database-url|database-ca-cert>}"
: "${PROJECT_ID:?set PROJECT_ID}"

case "$name" in
  api-database-url | migrate-database-url | database-ca-cert) ;;
  *)
    echo "unknown secret '$name'" >&2
    exit 2
    ;;
esac

if [[ -t 0 ]]; then
  read -r -s -p "Value for $name in $PROJECT_ID (input hidden): " value
  echo
else
  value="$(cat)"
fi

# Check the shape without ever printing the value.
case "$name" in
  *-database-url)
    if [[ ! "$value" =~ ^mysql://[^:@/]+:[^@]+@[^/]+/[A-Za-z0-9_]+$ ]]; then
      echo "expected mysql://user:password@host:port/database with no ?query (TLS is configured separately)" >&2
      exit 1
    fi
    ;;
  database-ca-cert)
    if [[ "$value" != *"-----BEGIN CERTIFICATE-----"* ]]; then
      echo "expected a PEM certificate (the CA certificate downloaded from Aiven)" >&2
      exit 1
    fi
    ;;
esac

printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=- --project "$PROJECT_ID" >/dev/null
unset value
echo "Added a new version of '$name' in $PROJECT_ID."
echo "Free tier allows 6 active versions in total: disable old ones once nothing uses them (runbook)."
