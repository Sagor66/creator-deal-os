#!/usr/bin/env bash
# One-time setup of a Google Cloud project for one environment. Safe to re-run:
# every step checks before it creates. Never handles a secret value; those are
# added afterwards with infra/gcp/set-secret.sh.
#
#   ENVIRONMENT=staging    PROJECT_ID=<staging-project> infra/gcp/bootstrap.sh
#   ENVIRONMENT=production PROJECT_ID=<prod-project> STAGING_PROJECT_ID=<staging-project> \
#     infra/gcp/bootstrap.sh
#
# Prerequisites: `gcloud auth login` as an owner of the project(s), billing linked.
# What it creates and why: docs/design/deployment.md §4–5, docs/runbooks/deploy-and-rollback.md.
set -euo pipefail

: "${ENVIRONMENT:?set ENVIRONMENT to staging or production}"
: "${PROJECT_ID:?set PROJECT_ID}"
REGION="${REGION:-europe-west4}"
# The numeric ID, not the name: a renamed or re-created repo can't inherit access.
GITHUB_REPOSITORY_ID="${GITHUB_REPOSITORY_ID:-1403470379}"
REGISTRY=images
POOL=github
PROVIDER=github

case "$ENVIRONMENT" in
  staging) ;;
  production) : "${STAGING_PROJECT_ID:?production copies images from staging; set STAGING_PROJECT_ID}" ;;
  *)
    echo "ENVIRONMENT must be staging or production" >&2
    exit 2
    ;;
esac

say() { printf '\n==> %s\n' "$*"; }
exists() { "$@" >/dev/null 2>&1; }
sa() { echo "$1@${PROJECT_ID}.iam.gserviceaccount.com"; }

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
DEPLOYER="$(sa deployer)"

say "Enabling APIs in $PROJECT_ID"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  secretmanager.googleapis.com iam.googleapis.com iamcredentials.googleapis.com \
  sts.googleapis.com --project "$PROJECT_ID"

say "Artifact Registry repository '$REGISTRY' ($REGION), keeping the 3 newest versions of each image"
if ! exists gcloud artifacts repositories describe "$REGISTRY" --location "$REGION" --project "$PROJECT_ID"; then
  gcloud artifacts repositories create "$REGISTRY" --repository-format=docker \
    --location "$REGION" --project "$PROJECT_ID" --description "api and web images"
fi
policy="$(mktemp)"
trap 'rm -f "$policy"' EXIT
cat >"$policy" <<'JSON'
[
  { "name": "keep-3-newest", "action": { "type": "Keep" }, "mostRecentVersions": { "keepCount": 3 } },
  { "name": "delete-the-rest", "action": { "type": "Delete" }, "condition": { "tagState": "ANY", "olderThan": "1d" } }
]
JSON
gcloud artifacts repositories set-cleanup-policies "$REGISTRY" --location "$REGION" \
  --project "$PROJECT_ID" --policy "$policy" --no-dry-run >/dev/null

say "Service accounts (the default compute identity has Editor; nothing here uses it)"
for pair in "api-runtime:Runs the api service" "web-runtime:Runs the web service (no permissions)" \
  "migrate-runtime:Runs the migrate job" "deployer:GitHub Actions deploys ($ENVIRONMENT)"; do
  name="${pair%%:*}"
  if ! exists gcloud iam service-accounts describe "$(sa "$name")" --project "$PROJECT_ID"; then
    gcloud iam service-accounts create "$name" --display-name "${pair#*:}" --project "$PROJECT_ID"
  fi
done

say "Secrets, stored only in $REGION (values are added later with infra/gcp/set-secret.sh)"
for secret in api-database-url migrate-database-url database-ca-cert; do
  if ! exists gcloud secrets describe "$secret" --project "$PROJECT_ID"; then
    gcloud secrets create "$secret" --replication-policy=user-managed --locations "$REGION" \
      --project "$PROJECT_ID"
  fi
done
grant_secret() {
  gcloud secrets add-iam-policy-binding "$1" --member "serviceAccount:$(sa "$2")" \
    --role roles/secretmanager.secretAccessor --project "$PROJECT_ID" --condition=None >/dev/null
}
grant_secret api-database-url api-runtime
grant_secret migrate-database-url migrate-runtime
grant_secret database-ca-cert api-runtime
grant_secret database-ca-cert migrate-runtime

say "Deployer permissions: deploy Cloud Run, push images, act as the three runtime identities"
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$DEPLOYER" \
  --role roles/run.admin --condition=None >/dev/null
gcloud artifacts repositories add-iam-policy-binding "$REGISTRY" --location "$REGION" \
  --project "$PROJECT_ID" --member "serviceAccount:$DEPLOYER" \
  --role roles/artifactregistry.writer >/dev/null
for runtime in api-runtime web-runtime migrate-runtime; do
  gcloud iam service-accounts add-iam-policy-binding "$(sa "$runtime")" --project "$PROJECT_ID" \
    --member "serviceAccount:$DEPLOYER" --role roles/iam.serviceAccountUser >/dev/null
done
if [[ "$ENVIRONMENT" == production ]]; then
  say "Production deployer may read staging's images (to copy the tested digests)"
  gcloud artifacts repositories add-iam-policy-binding "$REGISTRY" --location "$REGION" \
    --project "$STAGING_PROJECT_ID" --member "serviceAccount:$DEPLOYER" \
    --role roles/artifactregistry.reader >/dev/null
fi

say "Workload Identity Federation: only this repo's '$ENVIRONMENT' GitHub Environment can deploy here"
if ! exists gcloud iam workload-identity-pools describe "$POOL" --location global --project "$PROJECT_ID"; then
  gcloud iam workload-identity-pools create "$POOL" --location global \
    --display-name "GitHub Actions" --project "$PROJECT_ID"
fi
condition="assertion.repository_id == '${GITHUB_REPOSITORY_ID}' && assertion.environment == '${ENVIRONMENT}'"
mapping="google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.environment=assertion.environment"
if ! exists gcloud iam workload-identity-pools providers describe "$PROVIDER" --location global \
  --workload-identity-pool "$POOL" --project "$PROJECT_ID"; then
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" --location global \
    --workload-identity-pool "$POOL" --project "$PROJECT_ID" \
    --display-name "GitHub ($ENVIRONMENT)" --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "$mapping" --attribute-condition "$condition"
else
  gcloud iam workload-identity-pools providers update-oidc "$PROVIDER" --location global \
    --workload-identity-pool "$POOL" --project "$PROJECT_ID" \
    --attribute-mapping "$mapping" --attribute-condition "$condition" >/dev/null
fi
pool_path="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}"
gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER" --project "$PROJECT_ID" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/${pool_path}/attribute.repository_id/${GITHUB_REPOSITORY_ID}" >/dev/null

cat <<EOF

Done. Set these GitHub Environment variables for '$ENVIRONMENT' (they are not secrets):

  gh variable set GCP_PROJECT_ID --env $ENVIRONMENT --body "$PROJECT_ID"
  gh variable set GCP_REGION --env $ENVIRONMENT --body "$REGION"
  gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --env $ENVIRONMENT --body "${pool_path}/providers/${PROVIDER}"
  gh variable set GCP_DEPLOYER_SERVICE_ACCOUNT --env $ENVIRONMENT --body "$DEPLOYER"

Next: add the three secret values with infra/gcp/set-secret.sh (runbook, step 4).
EOF
