# Handoff — Dashboard Bioma

Snapshot completo do estado atual do projeto pra qualquer pessoa retomar do zero.

**Última atualização:** 2026-06-01

---

## TL;DR

Dashboard interno de funil CRM + atribuição Meta Ads pra **Bioma Incorporadora**, marca **Casa Vertical**. Gerido pela **RazConsulting** (consultoria do Marco). Em produção rodando em Vercel (frontend) + Cloud Run (backend), com sync diário 9h Brasília via Cloud Scheduler.

**URLs em prod:**
- Frontend: `https://api-dashboard-bioma-git-main-marcomonteiro28s-projects.vercel.app` (Vercel)
- Backend: `https://dashboard-api-svebzn6vkq-rj.a.run.app` (Cloud Run)
- Repo: https://github.com/Marcomonteiro28/api-dashboard-bioma

**Stack:**
- BigQuery (kondado-bioma) — DW gerenciado pela Kondado
- bioma_meta dataset — dados sincronizados por este projeto
- Node 20 + Express 5 — backend
- React 19 + Vite 6 + TS — frontend
- Cloud Run (sa-east1) — hosting backend
- Vercel — hosting frontend
- Cloud Scheduler — cron 9h America/Sao_Paulo
- Secret Manager — tokens Meta/AC
- Google OAuth — auth (sem Cloudflare)

---

## Arquitetura completa

```
Internet
    │
    ▼
[ Vercel (Frontend React) ]                  ← VITE_GOOGLE_CLIENT_ID
   bioma-dashboard.vercel.app                ← VITE_API_BASE_URL
    │  Authorization: Bearer <google-id-token>
    │  fetch /api/*
    ▼
[ Cloud Run (Backend Express) ]              ← projeto bioma-dash-mm28
   dashboard-api-xxx.run.app                  region southamerica-east1
    │  middleware/auth.js valida JWT Google + allowlist
    │  Workload Identity → SA dashboard-cloud-run@bioma-dash-mm28
    │
    ▼ cross-project IAM
[ BigQuery (kondado-bioma) ]                  ← gerenciado pela Kondado
   - crm_marts: stg_crm_deals, vw_status_atual
   - raw_data: activecampaign_*
   - bioma_meta: meta_*, ac_*, vw_* (sync deste projeto)

[ Cloud Scheduler 9h sa-east1 ]
    │  POST com X-Internal-Job-Token
    ▼
[ Cloud Run /jobs/sync-all ]
    │
    ├─→ AC API → bioma_meta.ac_*
    ├─→ Meta API → bioma_meta.meta_*
    └─→ apply_views (vw_*)
```

---

## Identidades e contas

| Item | Valor |
|---|---|
| Owner Marco | marco@razconsulting.com.br |
| Workspace/Org Google | razconsulting.com.br (ID `97183022246`) |
| GitHub user | Marcomonteiro28 |
| GCP project (dados) | `kondado-bioma` (gerenciado pela Kondado, contém BQ) |
| GCP project (deploy) | `bioma-dash-mm28` (criado em 2026-06-01) |
| Billing account | `01E2FE-F46074-A4754A` "Faturamento Raz" |
| Project number bioma-dash-mm28 | `1091166596114` |

---

## Credenciais externas

### Tokens (em Secret Manager + .env local)

| Secret | Onde está | Como rotacionar |
|---|---|---|
| `meta-access-token` | Secret Manager bioma-dash-mm28 | gerar novo em developers.facebook.com/apps/208677735605317 |
| `ac-api-token` | Secret Manager bioma-dash-mm28 | gerar novo em biomainc.activehosted.com → Settings → Developer |
| `internal-job-token` | Secret Manager bioma-dash-mm28 | `openssl rand -hex 32 \| gcloud secrets versions add ...` |

### Google OAuth (criado em 2026-06-01)

- **Client ID**: `1091166596114-5cu7726q65nmh6i34jhisk15453ibuac.apps.googleusercontent.com`
- **Tipo**: Web Application, modo Testing (Externo)
- **Project**: bioma-dash-mm28
- **Authorized origins**:
  - https://api-dashboard-bioma-git-main-marcomonteiro28s-projects.vercel.app
  - https://api-dashboard-bioma-bojut12re-marcomonteiro28s-projects.vercel.app
  - http://localhost:5173
- **Client Secret**: NÃO usado (GIS client-side só usa Client ID)

### Meta Ads App

- App ID: `208677735605317`
- Empresa: Bioma Incorporadora
- User do token: "Bioma API Integracao" (System User)
- Ad accounts (3): `act_983411360253919` (Casa Vertical), `act_827209131326862` (Vila Vertical Fradique), `act_433956351992024` (HP \| Bioma 2)

### ActiveCampaign

- URL: https://biomainc.api-us1.com
- User do token: joao@razconsulting.com.br

---

## GCP IAM crítico

### Service Account principal
`dashboard-cloud-run@bioma-dash-mm28.iam.gserviceaccount.com`

**Permissions:**
- `bioma-dash-mm28`: roles/secretmanager.secretAccessor, roles/run.admin, roles/artifactregistry.writer, roles/iam.serviceAccountUser
- `kondado-bioma` (cross-project): roles/bigquery.jobUser, roles/bigquery.dataViewer (crm_marts/raw_data — caiu pra project-level), roles/bigquery.dataEditor (bioma_meta)

### Workload Identity Federation pro GitHub Actions

- Pool: `github-actions` (global)
- Provider: `github` (OIDC issuer token.actions.githubusercontent.com)
- Attribute condition: `assertion.repository_owner == 'Marcomonteiro28'`

**GitHub Secrets configurados:**
- `GCP_PROJECT` = `bioma-dash-mm28`
- `WIF_PROVIDER` = `projects/1091166596114/locations/global/workloadIdentityPools/github-actions/providers/github`
- `WIF_SERVICE_ACCOUNT` = `dashboard-cloud-run@bioma-dash-mm28.iam.gserviceaccount.com`

### Org Policy

A org `razconsulting.com.br` (97183022246) tinha `iam.allowedPolicyMemberDomains` bloqueando `allUsers`. **Foi liberada só pro projeto bioma-dash-mm28** via `/tmp/policy-v2.yaml` com `allowAll: true`. Outros projetos da org continuam protegidos.

Marco tem role `Organization Policy Administrator` na org pra poder gerenciar isso futuramente.

---

## Sync de dados

### Comando manual
```bash
npm run sync:all       # AC + Meta + views (~7min)
npm run sync:ac        # só AC (~4min, 5400 deals + 36k custom fields)
npm run sync:meta      # só Meta (~3min, 95 camps + 7807 creatives + 549 adimages)
npm run apply:meta-views  # recria vw_*
```

### Cron
- **Cloud Scheduler** (a configurar): job `sync-dashboard-daily` no projeto bioma-dash-mm28, schedule `0 9 * * *`, time zone `America/Sao_Paulo`, dispara POST em `/jobs/sync-all` com header `X-Internal-Job-Token`.
- **Task Scheduler Windows** (legado): `Bioma Dashboard Sync Daily` no PC do Marco — **remover quando Cloud Scheduler estiver ativo**.

---

## Auth

Implementado em commit `512dcdb`. Frontend mostra tela de login → Google Identity Services renderiza botão "Sign in with Google" → ID token JWT é guardado em `localStorage` → propagado como `Authorization: Bearer <token>` em todas requests `/api/*`.

Backend `server/src/middleware/auth.js`:
- Valida assinatura JWT contra Google via `google-auth-library`
- Confere `email_verified === true`
- Confere allowlist: `ALLOWED_EMAIL_DOMAINS` (csv, default `razconsulting.com.br`) ou `ALLOWED_EMAILS` (csv individuais)
- 401 se token inválido/expirado; 403 se email não autorizado

**Em dev local**, sem `GOOGLE_CLIENT_ID` no `.env`, o middleware libera tudo (mantém comportamento atual).

---

## Endpoints principais

| Endpoint | Descrição | Auth |
|---|---|---|
| `GET /health` | ping (testa BQ) | público |
| `GET /auth/me` | info do user logado | Google JWT |
| `GET /api/empreendimentos` | lista pro dropdown | Google JWT |
| `GET /api/sub-origens` | lista pro dropdown (com "(Sem sub-origem)") | Google JWT |
| `GET /api/status-atual` | snapshot live do funil | Google JWT |
| `GET /api/performance-emp` | métricas por empreendimento (data + meta.totals distinct) | Google JWT |
| `GET /api/leads-weekly` | série semanal | Google JWT |
| `GET /api/attribution-emp` | Meta × CRM por empreendimento | Google JWT |
| `GET /api/attribution-creative` | top 20 criativos por leads | Google JWT |
| `GET /api/creative-funnel` | top 25 criativos por progressão (score) | Google JWT |
| `GET /api/deals?from=&to=...` | drill-down 5000 deals | Google JWT |
| `GET /api/leads/:dealId` | detalhe lead + criativo HD + ac_deal_url | Google JWT |
| `POST /jobs/sync-ac` | sync AC | X-Internal-Job-Token |
| `POST /jobs/sync-meta` | sync Meta | X-Internal-Job-Token |
| `POST /jobs/sync-all` | sync completo | X-Internal-Job-Token |
| `POST /jobs/apply-views` | recriar views | X-Internal-Job-Token |

---

## Comandos pra ativar tudo (sequência final)

### 1. Adicionar `VITE_GOOGLE_CLIENT_ID` no Vercel

Painel Vercel → Project → Settings → Environment Variables → Add:
- **Key**: `VITE_GOOGLE_CLIENT_ID`
- **Value**: `1091166596114-5cu7726q65nmh6i34jhisk15453ibuac.apps.googleusercontent.com`
- **Environments**: Production, Preview, Development

Depois Vercel → Deployments → últimas → "Redeploy" pra aplicar a env var.

### 2. Adicionar vars de auth no Cloud Run

```bash
gcloud run services update dashboard-api \
  --region=southamerica-east1 \
  --update-env-vars="GOOGLE_CLIENT_ID=1091166596114-5cu7726q65nmh6i34jhisk15453ibuac.apps.googleusercontent.com,ALLOWED_EMAIL_DOMAINS=razconsulting.com.br,ALLOWED_EMAILS=email1@biomainc.com.br,email2@biomainc.com.br"
```

Substituir os emails da Bioma reais separados por vírgula. Pode ser vazio inicialmente (ALLOWED_EMAILS=) — só time Raz acessa.

### 3. Adicionar test users no consent screen

GCP Console → APIs & Services → OAuth consent screen → "Test users" → add seu email e emails Bioma que vão acessar. Limite 100 users no modo Testing.

### 4. Criar Cloud Scheduler job (cron 9h)

```bash
TOKEN=$(gcloud secrets versions access latest --secret=internal-job-token)
URL=$(gcloud run services describe dashboard-api --region=southamerica-east1 --format="value(status.url)")

gcloud scheduler jobs create http sync-dashboard-daily \
  --location=southamerica-east1 \
  --schedule="0 9 * * *" \
  --time-zone="America/Sao_Paulo" \
  --uri="$URL/jobs/sync-all" \
  --http-method=POST \
  --headers="X-Internal-Job-Token=$TOKEN" \
  --attempt-deadline=15m
```

### 5. Desligar Task Scheduler Windows (após Cloud Scheduler validado)

```powershell
Unregister-ScheduledTask -TaskName "Bioma Dashboard Sync Daily" -Confirm:$false
```

---

## Troubleshooting comum

| Sintoma | Causa | Fix |
|---|---|---|
| 403 no Cloud Run | allUsers não autorizado | Aplicar `org-policies` com `allowAll: true` no projeto |
| Login Google em popup, vê erro "Access blocked" | email não está em test users | Adicionar em GCP Console → OAuth consent screen |
| 401 "Token Google inválido" | token expirou (~1h vida) | Frontend deve renovar — recarregar página |
| 403 "Email não autorizado" | email fora da allowlist | Adicionar em `ALLOWED_EMAILS` ou `ALLOWED_EMAIL_DOMAINS` |
| Sync demora muito | Meta rate limit | aumentar `META_RATE_LIMIT_MS`/`META_RETRY_*` |
| `bq.loaded` falha "streaming buffer" | Streaming insert ainda no buffer | usar load job (já feito em todos loaders) |
| GitHub Actions falha autenticação | WIF Secrets incorretos | conferir 3 secrets vs outputs do `setup-gcp-newproject.sh` |
| Vercel build falha "could not find package.json" | Root Directory errado | trocar pra `web` |

---

## Arquivos importantes do repo

```
/
├── server/src/
│   ├── index.js              boot Express
│   ├── config.js             env vars + defaults
│   ├── bq.js                 cliente BQ + cache
│   ├── bq-load.js            replaceTableLoad pra load jobs
│   ├── middleware/
│   │   ├── auth.js           ★ Google OAuth + allowlist
│   │   ├── logger.js
│   │   ├── rateLimit.js
│   │   └── errorHandler.js
│   ├── lib/                  cacheKey + parseFilters
│   ├── ac/                   ★ sync ActiveCampaign API
│   │   ├── client.js         fetch wrapper com order ASC + dedupe
│   │   ├── schemas.js
│   │   └── loaders.js
│   ├── meta/                 ★ sync Meta Marketing API
│   │   ├── client.js         retry + throttle
│   │   ├── schemas.js
│   │   ├── views.js          ★ vw_lead_creative + vw_status_atual_live
│   │   └── loaders.js        + syncAdImages, object_story_spec hash
│   ├── queries/              SQL builders
│   ├── routes/               handlers
│   └── jobs/                 scripts CLI (sync-meta, sync-ac, apply-views, etc)
├── web/                      ★ frontend Vite React TS
│   └── src/
│       ├── App.tsx           wrap em <Login> se não autenticado
│       ├── api.ts            ★ Bearer token + authStore
│       ├── components/
│       │   ├── Login.tsx     ★ Google Identity Services button
│       │   └── ... (10 componentes do dashboard)
│       └── styles.css        identidade Casa Vertical
├── scripts/
│   ├── setup-gcp.sh          inicial (projeto kondado-bioma — deprecated)
│   ├── setup-gcp-newproject.sh ★ usado pra bioma-dash-mm28
│   └── sync-daily.ps1        Windows Task Scheduler (a remover)
├── .github/workflows/
│   └── deploy-cloud-run.yml  ★ CI/CD via WIF
├── Dockerfile                ★ Cloud Run image
├── .dockerignore
├── DEPLOY.md                 runbook completo
├── QUICKSTART.md             11 steps (Cloud Shell)
├── HANDOFF.md                ★ este documento
└── CLAUDE.md                 contexto pra Claude Code futuro
```

---

## Próximos passos pendentes

1. ✅ Backend deployed em bioma-dash-mm28
2. ✅ Frontend deployed no Vercel
3. ✅ GitHub Actions CI/CD configurado
4. ⏳ Adicionar `VITE_GOOGLE_CLIENT_ID` no Vercel + redeploy
5. ⏳ Adicionar `GOOGLE_CLIENT_ID`/`ALLOWED_*` no Cloud Run
6. ⏳ Adicionar test users no OAuth consent screen
7. ⏳ Cloud Scheduler 9h
8. ⏳ Desligar Task Scheduler Windows
9. ⏳ Testar fluxo completo: login → dashboard → drill-down
10. (Opcional) Custom domain bioma.razconsulting.com.br no Vercel + CNAME no Registro.br

## Limpeza recomendada (após validação)

1. **Revogar tokens antigos** Meta (já consta no chat) e AC se ainda válidos
2. **Deletar** `client_secret_*.json` do Downloads (não usamos, mas é um secret)
3. **Considerar** revogar OAuth Client e criar novo (porque client_secret apareceu no chat — não é usado mas é cuidado extra)
4. **Revisar** quem tem acesso ao repo GitHub (private OK)
