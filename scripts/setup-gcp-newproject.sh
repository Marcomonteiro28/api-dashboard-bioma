#!/usr/bin/env bash
# Setup alternativo: cria projeto GCP novo (SEM organizacao) pra rodar Cloud Run
# sem restricoes de org policy. BQ continua no kondado-bioma via cross-project IAM.
#
# Pre-requisitos:
#   - Conta com billing ativo (free trial vale)
#   - Cloud Shell logado
#   - Owner ainda no projeto kondado-bioma (pra dar permission ao novo SA)
#
# Uso:
#   bash scripts/setup-gcp-newproject.sh PROJECT_ID OWNER/repo BILLING_ACCOUNT_ID
#
# Exemplo:
#   bash scripts/setup-gcp-newproject.sh bioma-dashboard-prd-001 Marcomonteiro28/api-dashboard-bioma 01ABCD-EFGH12-IJKL34

set -euo pipefail

NEW_PROJECT="${1:-}"
GITHUB_REPO="${2:-}"
BILLING_ID="${3:-}"

if [ -z "${NEW_PROJECT}" ] || [ -z "${GITHUB_REPO}" ] || [ -z "${BILLING_ID}" ]; then
  echo "Uso: $0 PROJECT_ID OWNER/repo BILLING_ACCOUNT_ID"
  echo ""
  echo "Pra listar billing accounts disponiveis:"
  echo "  gcloud beta billing accounts list"
  exit 1
fi

DATA_PROJECT="kondado-bioma"
REGION="southamerica-east1"
SA_NAME="dashboard-cloud-run"
SA_EMAIL="${SA_NAME}@${NEW_PROJECT}.iam.gserviceaccount.com"

echo "==> Projeto novo (sem org): ${NEW_PROJECT}"
echo "==> Projeto de dados (BQ): ${DATA_PROJECT}"
echo "==> Billing: ${BILLING_ID}"
echo "==> Region: ${REGION}"

echo ""
echo "==> 1/7 Criando projeto novo (fora de qualquer org)..."
gcloud projects create "${NEW_PROJECT}" \
  --name="Bioma Dashboard Prod" 2>/dev/null || echo "  (ja existia)"

gcloud config set project "${NEW_PROJECT}"

echo ""
echo "==> 2/7 Vinculando billing account..."
gcloud beta billing projects link "${NEW_PROJECT}" \
  --billing-account="${BILLING_ID}"

echo ""
echo "==> 3/7 Habilitando APIs no projeto novo..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  cloudscheduler.googleapis.com \
  secretmanager.googleapis.com \
  iamcredentials.googleapis.com \
  iam.googleapis.com

echo ""
echo "==> 4/7 Criando Service Account no projeto novo..."
gcloud iam service-accounts create "${SA_NAME}" \
  --display-name="Dashboard Bioma Cloud Run" 2>/dev/null || echo "  (ja existia)"

echo ""
echo "==> 4.1/7 Permissions IAM no projeto novo..."
gcloud projects add-iam-policy-binding "${NEW_PROJECT}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" --condition=None >/dev/null

# Project number do projeto novo (pra Cloud Build SA)
NEW_PN=$(gcloud projects describe "${NEW_PROJECT}" --format="value(projectNumber)")
COMPUTE_SA="${NEW_PN}-compute@developer.gserviceaccount.com"

# Habilita Cloud Build SA pra fazer builds (mesmo issue do projeto antigo)
gcloud projects add-iam-policy-binding "${NEW_PROJECT}" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/cloudbuild.builds.builder" --condition=None >/dev/null

echo ""
echo "==> 5/7 Cross-project IAM: dar acesso BQ do ${DATA_PROJECT} ao SA novo..."

# Roles no projeto kondado-bioma (jobs, etc)
gcloud projects add-iam-policy-binding "${DATA_PROJECT}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/bigquery.jobUser" --condition=None >/dev/null

# Datasets (dataset-level com fallback project-level)
bq_grant_cross() {
  local ds="$1"
  local role="$2"
  if bq add-iam-policy-binding \
      --member="serviceAccount:${SA_EMAIL}" \
      --role="${role}" \
      "${DATA_PROJECT}:${ds}" 2>/dev/null; then
    echo "  ok dataset-level: ${ds} ${role}"
  else
    echo "  WARN dataset-level falhou em ${ds}, project-level..."
    gcloud projects add-iam-policy-binding "${DATA_PROJECT}" \
      --member="serviceAccount:${SA_EMAIL}" \
      --role="${role}" --condition=None >/dev/null
  fi
}

bq_grant_cross "crm_marts" "roles/bigquery.dataViewer"
bq_grant_cross "raw_data" "roles/bigquery.dataViewer"
bq_grant_cross "bioma_meta" "roles/bigquery.dataEditor"

echo ""
echo "==> 6/7 Artifact Registry repo no projeto novo..."
gcloud artifacts repositories create dashboard \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Dashboard Bioma containers" 2>/dev/null || echo "  (ja existia)"

echo ""
echo "==> 7/7 Secrets (vazios + internal-job-token random)..."
for SECRET in meta-access-token ac-api-token internal-job-token; do
  gcloud secrets create "${SECRET}" \
    --replication-policy=automatic 2>/dev/null && \
    echo "  criado: ${SECRET}" || echo "  (ja existia: ${SECRET})"
done

openssl rand -hex 32 | gcloud secrets versions add internal-job-token --data-file=-

echo ""
echo "==> 8/7 Workload Identity Federation pro GitHub Actions..."
POOL="github-actions"
PROVIDER="github"

gcloud iam workload-identity-pools create "${POOL}" \
  --location=global \
  --display-name="GitHub Actions" 2>/dev/null || echo "  (pool ja existia)"

POOL_ID=$(gcloud iam workload-identity-pools describe "${POOL}" \
  --location=global --format="value(name)")

gcloud iam workload-identity-pools providers create-oidc "${PROVIDER}" \
  --workload-identity-pool="${POOL}" \
  --location=global \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == '${GITHUB_REPO%%/*}'" 2>/dev/null || echo "  (provider ja existia)"

gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/${POOL_ID}/attribute.repository/${GITHUB_REPO}" >/dev/null

# Roles de deploy pro SA
gcloud projects add-iam-policy-binding "${NEW_PROJECT}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin" --condition=None >/dev/null

gcloud projects add-iam-policy-binding "${NEW_PROJECT}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer" --condition=None >/dev/null

gcloud projects add-iam-policy-binding "${NEW_PROJECT}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" --condition=None >/dev/null

PROVIDER_FULL="${POOL_ID}/providers/${PROVIDER}"

echo ""
echo "==========================================="
echo "GitHub Secrets a atualizar em github.com/${GITHUB_REPO}/settings/secrets/actions:"
echo ""
echo "  GCP_PROJECT           = ${NEW_PROJECT}"
echo "  WIF_PROVIDER          = ${PROVIDER_FULL}"
echo "  WIF_SERVICE_ACCOUNT   = ${SA_EMAIL}"
echo "==========================================="

echo ""
echo "==> Setup completo!"
echo ""
echo "Proximos passos:"
echo "  1. Preencher os 2 tokens reais:"
echo "     echo -n '<META_TOKEN>' | gcloud secrets versions add meta-access-token --data-file=-"
echo "     echo -n '<AC_TOKEN>'   | gcloud secrets versions add ac-api-token    --data-file=-"
echo ""
echo "  2. Build + deploy no projeto novo:"
echo "     gcloud builds submit --tag ${REGION}-docker.pkg.dev/${NEW_PROJECT}/dashboard/api:latest"
echo "     (depois roda gcloud run deploy com as flags do DEPLOY.md ajustando o projeto)"
