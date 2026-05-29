# Deploy do dashboard na nuvem

Runbook pra subir o dashboard em produção atendendo time RazConsulting + Bioma.

**Arquitetura final:**
```
[ Cloudflare Access ]  ← Google login + email allowlist
        │
[ Cloudflare Pages ]   ← frontend React (build de /web/dist)
        │  /api/* → backend
[ Cloud Run ]          ← backend Express (Dockerfile)
        │  Workload Identity
[ BigQuery ]           ← já existe, kondado-bioma

[ Cloud Scheduler ]    ← cron diário 9h America/Sao_Paulo
        │ OIDC + X-Internal-Job-Token
[ Cloud Run /jobs/* ]
```

**Domínio:** `bioma.razconsulting.com.br` (subdomínio sob razconsulting.com.br)

## CI/CD — push pra master deploya tudo

Após o setup inicial (~30min), o fluxo fica:
```
git push origin master
       │
       ├──► GitHub Actions  (deploy-cloud-run.yml)
       │       └─ docker build + push + gcloud run deploy
       │
       └──► Cloudflare Pages  (conectado ao repo)
               └─ vite build + servir estático
```

---

## Fase Cloud-B — Setup GCP (uma vez, ~5min)

### Caminho rápido: script faz tudo de uma vez

```bash
bash scripts/setup-gcp.sh kondado-bioma <SEU-USUARIO-GH>/api-dashboard-bioma
```

O script:
- Habilita 6 APIs (run, build, artifact registry, scheduler, secret manager, iam credentials)
- Cria SA `dashboard-cloud-run` + permissions BQ + Secret Manager
- Cria Artifact Registry `dashboard`
- Cria 3 secrets (meta/AC vazios pra preencher, internal-job-token random)
- Configura Workload Identity Federation pro GitHub Actions
- Imprime os 3 GitHub Secrets a configurar

**Depois do script**, preencha os 2 tokens reais:
```bash
echo -n "<META_ACCESS_TOKEN>" | gcloud secrets versions add meta-access-token --data-file=-
echo -n "<AC_API_TOKEN>"      | gcloud secrets versions add ac-api-token --data-file=-
```

Pra rotacionar depois, mesmo comando — gera nova versão e o Cloud Run pega na próxima request.

### Caminho passo-a-passo (opcional, se preferir não rodar o script)

#### 1. Habilitar APIs no projeto `kondado-bioma`

```bash
gcloud config set project kondado-bioma

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  cloudscheduler.googleapis.com \
  secretmanager.googleapis.com \
  iamcredentials.googleapis.com
```

#### 2. Criar Service Account pro Cloud Run

```bash
gcloud iam service-accounts create dashboard-cloud-run \
  --display-name="Dashboard Bioma Cloud Run"

SA="dashboard-cloud-run@kondado-bioma.iam.gserviceaccount.com"
```

#### 3. Dar permissões ao SA

```bash
# Roda jobs BigQuery
gcloud projects add-iam-policy-binding kondado-bioma \
  --member="serviceAccount:$SA" \
  --role="roles/bigquery.jobUser"

# Le crm_marts (gerenciado pela Kondado) e raw_data (tabelas brutas)
bq add-iam-policy-binding \
  --member="serviceAccount:$SA" \
  --role="roles/bigquery.dataViewer" \
  kondado-bioma:crm_marts

bq add-iam-policy-binding \
  --member="serviceAccount:$SA" \
  --role="roles/bigquery.dataViewer" \
  kondado-bioma:raw_data

# Le E escreve bioma_meta (sync Meta/AC + views)
bq add-iam-policy-binding \
  --member="serviceAccount:$SA" \
  --role="roles/bigquery.dataEditor" \
  kondado-bioma:bioma_meta

# Acessa secrets
gcloud projects add-iam-policy-binding kondado-bioma \
  --member="serviceAccount:$SA" \
  --role="roles/secretmanager.secretAccessor"
```

### 4. Criar secrets pros tokens

```bash
# Meta access token
echo -n "<META_ACCESS_TOKEN>" | gcloud secrets create meta-access-token \
  --data-file=- --replication-policy=automatic

# AC API token
echo -n "<AC_API_TOKEN>" | gcloud secrets create ac-api-token \
  --data-file=- --replication-policy=automatic

# Internal job token (gerado random, será injetado também no Cloud Scheduler)
openssl rand -hex 32 | gcloud secrets create internal-job-token \
  --data-file=- --replication-policy=automatic
```

Pra rotacionar depois:
```bash
echo -n "<NOVO_TOKEN>" | gcloud secrets versions add meta-access-token --data-file=-
```

---

## Fase Cloud-A + Cloud-F já feitas no código

- `Dockerfile` na raiz
- `server/src/routes/jobs.js` com `/jobs/sync-ac`, `/jobs/sync-meta`, `/jobs/apply-views`, `/jobs/sync-all`
- Auth via `X-Internal-Job-Token` header (validado contra `INTERNAL_JOB_TOKEN` env var)
- Frontend lê `VITE_API_BASE_URL` (vazio em dev = usa proxy Vite)
- `.github/workflows/deploy-cloud-run.yml` — CI/CD que builda e deploya no push pra master
- `scripts/setup-gcp.sh` — automatiza setup GCP

---

## Fase Cloud-B (continuação) — Build + Deploy inicial

### 5. Build via Cloud Build (sem dockerfile local)

Da raiz do projeto:
```bash
gcloud builds submit --tag southamerica-east1-docker.pkg.dev/kondado-bioma/dashboard/api:latest
```

Se a primeira vez:
```bash
gcloud artifacts repositories create dashboard \
  --repository-format=docker \
  --location=southamerica-east1 \
  --description="Dashboard Bioma containers"
```

### 6. Deploy no Cloud Run

```bash
gcloud run deploy dashboard-api \
  --image=southamerica-east1-docker.pkg.dev/kondado-bioma/dashboard/api:latest \
  --region=southamerica-east1 \
  --service-account=$SA \
  --no-allow-unauthenticated \
  --set-env-vars="GCP_PROJECT_ID=kondado-bioma,BQ_DATASET=crm_marts,BQ_LOCATION=southamerica-east1,META_BQ_DATASET=bioma_meta,AC_BQ_DATASET=bioma_meta,AC_API_URL=https://biomainc.api-us1.com,META_AD_ACCOUNT_IDS=act_983411360253919\,act_827209131326862\,act_433956351992024,META_API_VERSION=v20.0,META_INSIGHTS_LOOKBACK_DAYS=30,ALLOWED_ORIGIN=https://bioma.razconsulting.com.br,NODE_ENV=production" \
  --set-secrets="META_ACCESS_TOKEN=meta-access-token:latest,AC_API_TOKEN=ac-api-token:latest,INTERNAL_JOB_TOKEN=internal-job-token:latest" \
  --memory=512Mi \
  --cpu=1 \
  --timeout=600 \
  --max-instances=3 \
  --min-instances=0
```

Anota a URL retornada (algo como `https://dashboard-api-xxxxx-uc.a.run.app`).

### 6.1 GitHub Secrets pro CI/CD

Em `https://github.com/<owner>/api-dashboard-bioma/settings/secrets/actions`, adicionar:

- `GCP_PROJECT` = `kondado-bioma`
- `WIF_PROVIDER` = `projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/github-actions/providers/github` (impresso pelo setup-gcp.sh)
- `WIF_SERVICE_ACCOUNT` = `dashboard-cloud-run@kondado-bioma.iam.gserviceaccount.com`

A partir desse ponto, **`git push origin master` deploya backend automaticamente**.

### 7. Permitir que Cloudflare invoque (público pro frontend)

Pra os endpoints `/api/*` e `/health` ficarem públicos (Cloudflare Access que protege), preciso de uma rota alternativa. **Mais simples**: usar Cloudflare Workers/Pages com `--allow-unauthenticated` no Cloud Run, e proteger TUDO via Cloudflare Access na frente.

Reaplica como público:
```bash
gcloud run services add-iam-policy-binding dashboard-api \
  --region=southamerica-east1 \
  --member="allUsers" \
  --role="roles/run.invoker"
```

A proteção fica 100% no Cloudflare Access (próxima fase).

---

## Fase Cloud-C — Frontend no Cloudflare Pages

### 1. No painel Cloudflare → Pages → "Create application" → "Connect to git"

- Selecionar o repo `api-dashboard-bioma`
- Production branch: `master`
- Build settings:
  - **Framework preset**: None
  - **Build command**: `cd web && npm install && npm run build`
  - **Build output directory**: `web/dist`
  - **Root directory**: `/`
- Environment variables:
  - `VITE_API_BASE_URL` = `https://dashboard-api-xxxxx-uc.a.run.app` (URL do Cloud Run)
- Salvar e fazer primeiro deploy

### 2. Configurar domínio custom

Em Pages → Custom domains → Add:
- `bioma.razconsulting.com.br`
- Cloudflare instrui adicionar CNAME no DNS (`bioma` → `<projeto>.pages.dev`)
- Se DNS está no Cloudflare, ele faz automaticamente

---

## Fase Cloud-D — Cloudflare Access

### 1. Ativar Zero Trust no painel Cloudflare

Cloudflare → Zero Trust → Settings → Pick a team name (uma vez só)

### 2. Adicionar Google como identity provider

Zero Trust → Settings → Authentication → Add new → Google
- Cole credentials OAuth do Google Cloud Console
- Tutorial oficial: https://developers.cloudflare.com/cloudflare-one/identity/idp-integration/google/

### 3. Criar Application protegendo o dashboard

Zero Trust → Access → Applications → Add an application → Self-hosted
- Application name: "Dashboard Bioma"
- Subdomain: `bioma`
- Domain: `razconsulting.com.br`
- Identity providers: Google + One-Time PIN (fallback email)

### 4. Criar Policy de acesso

- Policy name: "Time autorizado"
- Action: Allow
- Configure rules:
  - **Emails ending in**: `@razconsulting.com.br` (time interno)
  - **Emails**: listar emails específicos da Bioma (ex: `comercial@biomainc.com.br`)

### 5. Proteger também a URL do Cloud Run

O Cloud Run `dashboard-api-xxxxx.run.app` ainda fica público mas só responde se o request vier do Cloudflare Pages do mesmo projeto. Defender com:
- `ALLOWED_ORIGIN=https://bioma.razconsulting.com.br` (já configurado) bloqueia browsers fora do dominio via CORS
- Considerar Cloudflare Tunnel ou IAP futuro pra reforçar

---

## Fase Cloud-E — Cloud Scheduler (cron 9h Brasília)

### 1. Criar job de sync diário

```bash
SA_SCHEDULER="dashboard-cloud-run@kondado-bioma.iam.gserviceaccount.com"

# Recupera valor do internal token pra colocar no header
TOKEN=$(gcloud secrets versions access latest --secret=internal-job-token)

CLOUD_RUN_URL=$(gcloud run services describe dashboard-api \
  --region=southamerica-east1 --format="value(status.url)")

gcloud scheduler jobs create http sync-dashboard-daily \
  --location=southamerica-east1 \
  --schedule="0 9 * * *" \
  --time-zone="America/Sao_Paulo" \
  --uri="$CLOUD_RUN_URL/jobs/sync-all" \
  --http-method=POST \
  --headers="X-Internal-Job-Token=$TOKEN,Content-Type=application/json" \
  --attempt-deadline=15m
```

Pra testar imediatamente:
```bash
gcloud scheduler jobs run sync-dashboard-daily --location=southamerica-east1
```

Logs no Cloud Run:
```bash
gcloud run services logs read dashboard-api --region=southamerica-east1 --limit=50
```

### 2. Após validar, **remover a Task Scheduler do Windows**

```powershell
Unregister-ScheduledTask -TaskName "Bioma Dashboard Sync Daily" -Confirm:$false
```

---

## Validação final

1. https://bioma.razconsulting.com.br → redirect pra Google login
2. Após login com email autorizado → dashboard carrega
3. Filtros funcionam, modal Lead+Criativo abre, "Abrir no AC" navega
4. Cloud Scheduler dispara 9h amanhã automaticamente

---

## Custo esperado

- Cloud Run: $0 (tráfego baixo, scale-to-zero)
- BigQuery: $0-5/mês (queries cacheadas + sync diário)
- Secret Manager: $0 (3 secrets, free tier)
- Cloud Scheduler: $0 (free tier 3 jobs)
- Cloudflare Pages + Access: $0 (free tier <50 users)
- **Total: ~$0-5/mês**

---

## Rollback de emergência

Se algo quebra em prod:
- **Frontend**: Cloudflare Pages → Deployments → "Rollback" pro deploy anterior
- **Backend**: `gcloud run services update-traffic dashboard-api --region=southamerica-east1 --to-revisions=PREVIOUS=100`
- **Cron**: `gcloud scheduler jobs pause sync-dashboard-daily --location=southamerica-east1`

---

## O que NÃO entra no deploy

- `service-account.json` (ficava em arquivo localmente) — Cloud Run usa **Workload Identity** automaticamente
- `.env` (secrets agora em Secret Manager)
- `scripts/sync-daily.ps1` (era pra Task Scheduler Windows, agora Cloud Scheduler faz)
- `dashboard.html` original (mantido no repo como referência, mas só `web/dist` vai pro Pages)
