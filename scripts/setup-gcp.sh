#!/usr/bin/env bash
# Setup inicial do GCP para o dashboard (rodar 1x).
# Executa em sequencia:
#   1. Habilita APIs necessarias
#   2. Cria SA dashboard-cloud-run + permissions BQ + Secret Manager
#   3. Cria Artifact Registry pro Docker image
#   4. Cria 3 secrets vazios (vc preenche depois com gcloud secrets versions add)
#   5. Cria Workload Identity Pool + Provider pro GitHub Actions
#
# Pre-requisitos:
#   - gcloud CLI logado com user que tem Owner ou Editor no projeto
#   - bq CLI funcional (vem com Cloud SDK)
#
# Uso:
#   bash scripts/setup-gcp.sh kondado-bioma marco-raz/api-dashboard-bioma

set -euo pipefail

PROJECT="${1:-kondado-bioma}"
GITHUB_REPO="${2:-}"   # formato: owner/repo, ex: marco-raz/api-dashboard-bioma
REGION="southamerica-east1"
SA_NAME="dashboard-cloud-run"
SA_EMAIL="${SA_NAME}@${PROJECT}.iam.gserviceaccount.com"

echo "==> Projeto: ${PROJECT}"
echo "==> Region: ${REGION}"
gcloud config set project "${PROJECT}"

echo ""
echo "==> 1/5 Habilitando APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  cloudscheduler.googleapis.com \
  secretmanager.googleapis.com \
  iamcredentials.googleapis.com \
  iam.googleapis.com

echo ""
echo "==> 2/5 Criando Service Account ${SA_EMAIL}..."
gcloud iam service-accounts create "${SA_NAME}" \
  --display-name="Dashboard Bioma Cloud Run" 2>/dev/null || echo "  (ja existia)"

echo ""
echo "==> 2.1/5 Permissions IAM..."
gcloud projects add-iam-policy-binding "${PROJECT}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/bigquery.jobUser" --condition=None >/dev/null

gcloud projects add-iam-policy-binding "${PROJECT}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" --condition=None >/dev/null

echo ""
echo "==> 2.2/5 Permissions BQ datasets..."
# Tenta dataset-level (mais granular). Se falhar (Kondado pode ser dona de
# crm_marts/raw_data e nao deixar voce mexer no IAM deles), faz fallback
# pra project-level que cobre o mesmo escopo.
bq_grant() {
  local ds="$1"
  local role="$2"
  if bq add-iam-policy-binding \
      --member="serviceAccount:${SA_EMAIL}" \
      --role="${role}" \
      "${PROJECT}:${ds}" 2>/dev/null; then
    echo "  ok dataset-level: ${ds} ${role}"
  else
    echo "  WARN dataset-level falhou em ${ds} (provavelmente owner outro), tentando project-level..."
    gcloud projects add-iam-policy-binding "${PROJECT}" \
      --member="serviceAccount:${SA_EMAIL}" \
      --role="${role}" \
      --condition=None >/dev/null
    echo "  ok project-level: ${role}"
  fi
}

bq_grant "crm_marts" "roles/bigquery.dataViewer"
bq_grant "raw_data" "roles/bigquery.dataViewer"
bq_grant "bioma_meta" "roles/bigquery.dataEditor"

echo ""
echo "==> 3/5 Criando Artifact Registry repo 'dashboard'..."
gcloud artifacts repositories create dashboard \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Dashboard Bioma containers" 2>/dev/null || echo "  (ja existia)"

echo ""
echo "==> 4/5 Criando 3 secrets vazios (preencha com gcloud secrets versions add)..."
for SECRET in meta-access-token ac-api-token internal-job-token; do
  gcloud secrets create "${SECRET}" \
    --replication-policy=automatic 2>/dev/null && echo "  criado: ${SECRET}" || echo "  (ja existia: ${SECRET})"
done

echo ""
echo "  Gerando internal-job-token random (overwrite a versao corrente)..."
openssl rand -hex 32 | gcloud secrets versions add internal-job-token --data-file=-

if [ -n "${GITHUB_REPO}" ]; then
  echo ""
  echo "==> 5/5 Configurando Workload Identity Federation pro GitHub Actions..."
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

  echo ""
  echo "  Permitindo o repo ${GITHUB_REPO} impersonar ${SA_EMAIL}..."
  gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
    --role=roles/iam.workloadIdentityUser \
    --member="principalSet://iam.googleapis.com/${POOL_ID}/attribute.repository/${GITHUB_REPO}" >/dev/null

  echo ""
  echo "  Para o GH Actions deployar, o SA tambem precisa de role de deploy:"
  gcloud projects add-iam-policy-binding "${PROJECT}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/run.admin" --condition=None >/dev/null

  gcloud projects add-iam-policy-binding "${PROJECT}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/artifactregistry.writer" --condition=None >/dev/null

  gcloud projects add-iam-policy-binding "${PROJECT}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/iam.serviceAccountUser" --condition=None >/dev/null

  echo ""
  PROVIDER_FULL="${POOL_ID}/providers/${PROVIDER}"
  echo "==========================================="
  echo "GitHub Secrets a configurar em github.com/${GITHUB_REPO}/settings/secrets/actions:"
  echo ""
  echo "  GCP_PROJECT           = ${PROJECT}"
  echo "  WIF_PROVIDER          = ${PROVIDER_FULL}"
  echo "  WIF_SERVICE_ACCOUNT   = ${SA_EMAIL}"
  echo "==========================================="
fi

echo ""
echo "==> Setup completo!"
echo ""
echo "Proximos passos:"
echo "  1. Preencha os secrets com os tokens reais:"
echo "     echo -n '<META_TOKEN>' | gcloud secrets versions add meta-access-token --data-file=-"
echo "     echo -n '<AC_TOKEN>'   | gcloud secrets versions add ac-api-token    --data-file=-"
echo ""
echo "  2. Build + deploy inicial:"
echo "     gcloud builds submit --tag ${REGION}-docker.pkg.dev/${PROJECT}/dashboard/api:latest"
echo "     gcloud run deploy dashboard-api \\"
echo "       --image=${REGION}-docker.pkg.dev/${PROJECT}/dashboard/api:latest \\"
echo "       --region=${REGION} \\"
echo "       --service-account=${SA_EMAIL} \\"
echo "       (resto das flags no DEPLOY.md)"
echo ""
echo "  3. Configurar Cloudflare Pages, Access e Cloud Scheduler (DEPLOY.md)"
