# Quickstart — subir o dashboard online

Caminho mais rápido, sem instalar nada localmente. Usa **Cloud Shell** (terminal no browser, já autenticado no GCP).

**Pré-requisitos suas:**
- Conta GitHub (free)
- Acesso ao projeto GCP `kondado-bioma` (Owner ou Editor)
- Acesso à sua conta Cloudflare (você já gerencia o DNS de `razconsulting.com.br` lá)

**Tempo estimado:** ~30min do zero até dashboard online.

---

## Step 1 — Criar repo no GitHub (2 min)

1. Vai em https://github.com/new
2. Repository name: `api-dashboard-bioma`
3. **Private** (recomendado — tem código de integração com tokens)
4. Não criar README/license/gitignore (já existem)
5. Clica "Create repository"
6. Copia o comando `git remote add origin https://github.com/SEU-USUARIO/api-dashboard-bioma.git`

## Step 2 — Push o código (1 min)

No PowerShell local, da pasta do projeto:

```powershell
cd C:\Users\marco\Projetos\api-dashboard-bioma
git remote add origin https://github.com/SEU-USUARIO/api-dashboard-bioma.git
git push -u origin master
```

(Vai pedir login GitHub na primeira vez — usa email/PAT ou GitHub Desktop se preferir UI.)

## Step 3 — Abrir Cloud Shell (1 min)

1. Vai em https://console.cloud.google.com
2. Confirma que o projeto selecionado é `kondado-bioma` (canto superior)
3. Clica no ícone **`>_`** no canto superior direito → "Ativar Cloud Shell"
4. Em ~30s abre um terminal no browser. Você já está autenticado.

## Step 4 — Clonar repo + rodar setup (5 min)

No Cloud Shell:

```bash
git clone https://github.com/SEU-USUARIO/api-dashboard-bioma.git
cd api-dashboard-bioma
bash scripts/setup-gcp.sh kondado-bioma SEU-USUARIO/api-dashboard-bioma
```

O script roda ~5min e no final imprime **3 valores** que você precisa copiar:
- `GCP_PROJECT`
- `WIF_PROVIDER`
- `WIF_SERVICE_ACCOUNT`

## Step 5 — Preencher tokens (2 min)

Ainda no Cloud Shell. Cola os tokens reais:

```bash
echo -n "EAAdp6bcIargBR..." | gcloud secrets versions add meta-access-token --data-file=-
echo -n "8f3f58219027..."   | gcloud secrets versions add ac-api-token --data-file=-
```

(Pega esses valores do seu `.env` local — o último Meta token + AC token que estão em uso.)

## Step 6 — Build + deploy inicial (5 min)

```bash
gcloud builds submit --tag southamerica-east1-docker.pkg.dev/kondado-bioma/dashboard/api:latest

gcloud run deploy dashboard-api \
  --image=southamerica-east1-docker.pkg.dev/kondado-bioma/dashboard/api:latest \
  --region=southamerica-east1 \
  --service-account=dashboard-cloud-run@kondado-bioma.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --set-env-vars="GCP_PROJECT_ID=kondado-bioma,BQ_DATASET=crm_marts,BQ_LOCATION=southamerica-east1,META_BQ_DATASET=bioma_meta,AC_BQ_DATASET=bioma_meta,AC_API_URL=https://biomainc.api-us1.com,META_AD_ACCOUNT_IDS=act_983411360253919\,act_827209131326862\,act_433956351992024,META_API_VERSION=v20.0,META_INSIGHTS_LOOKBACK_DAYS=30,ALLOWED_ORIGIN=https://bioma.razconsulting.com.br,NODE_ENV=production" \
  --set-secrets="META_ACCESS_TOKEN=meta-access-token:latest,AC_API_TOKEN=ac-api-token:latest,INTERNAL_JOB_TOKEN=internal-job-token:latest" \
  --memory=512Mi \
  --cpu=1 \
  --timeout=600 \
  --max-instances=3
```

No final retorna uma URL tipo `https://dashboard-api-xxxxx.a.run.app`. **Copia essa URL.**

Testa:
```bash
URL=$(gcloud run services describe dashboard-api --region=southamerica-east1 --format="value(status.url)")
curl $URL/health
```

Deve retornar `{"status":"ok","bq":"connected",...}`.

## Step 7 — GitHub Secrets (2 min)

Em https://github.com/SEU-USUARIO/api-dashboard-bioma/settings/secrets/actions, adiciona 3 secrets (com os valores que o setup-gcp.sh imprimiu no Step 4):

- `GCP_PROJECT` = `kondado-bioma`
- `WIF_PROVIDER` = `projects/.../workloadIdentityPools/github-actions/providers/github`
- `WIF_SERVICE_ACCOUNT` = `dashboard-cloud-run@kondado-bioma.iam.gserviceaccount.com`

A partir daqui, **todo `git push` deploya o backend automaticamente** via GitHub Actions.

## Step 8 — Cloudflare Pages (5 min)

1. https://dash.cloudflare.com → Pages → "Create application" → "Connect to git"
2. Authoriza GitHub e seleciona `api-dashboard-bioma`
3. Configuração de build:
   - **Framework preset**: None
   - **Build command**: `cd web && npm install && npm run build`
   - **Build output directory**: `web/dist`
   - **Root directory**: `/` (deixa vazio)
4. Environment variables (Production):
   - `VITE_API_BASE_URL` = `https://dashboard-api-xxxxx.a.run.app` (URL do Cloud Run do Step 6)
5. Salvar e fazer primeiro deploy. Aguarda ~2min.
6. Após deploy, vai em **Custom domains** → "Set up a custom domain"
   - `bioma.razconsulting.com.br`
   - Como o DNS de razconsulting.com.br já está no Cloudflare, ele cria o CNAME sozinho

## Step 9 — Cloudflare Access (10 min)

1. Cloudflare → **Zero Trust** → setup inicial (escolhe team name, ex: `razconsulting`)
2. **Settings** → **Authentication** → **Login methods** → Add new → **Google**
   - Vai pedir Client ID e Secret. Cria em https://console.cloud.google.com/apis/credentials
     - "OAuth 2.0 Client ID" → Web application
     - Authorized redirect URI: `https://razconsulting.cloudflareaccess.com/cdn-cgi/access/callback`
   - Cola Client ID + Secret no Cloudflare
3. **Access** → **Applications** → "Add an application" → **Self-hosted**
   - Application name: `Dashboard Bioma`
   - Application domain: `bioma.razconsulting.com.br`
   - Identity providers: marca Google + One-time PIN
4. **Policies** → "Add a policy":
   - Policy name: `Time autorizado`
   - Action: **Allow**
   - Configure rules:
     - **Include** → **Emails ending in** → `@razconsulting.com.br`
     - **Or** → **Emails** → adiciona individualmente emails Bioma (ex: `comercial@biomainc.com.br`)

## Step 10 — Cloud Scheduler cron 9h (1 min)

No Cloud Shell:

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

Pra testar agora (sem esperar 9h amanhã):
```bash
gcloud scheduler jobs run sync-dashboard-daily --location=southamerica-east1
gcloud run services logs read dashboard-api --region=southamerica-east1 --limit=30
```

## Step 11 — Desligar Task Scheduler do Windows (30s)

No PowerShell local:
```powershell
Unregister-ScheduledTask -TaskName "Bioma Dashboard Sync Daily" -Confirm:$false
```

---

## Validação final

1. Acessa https://bioma.razconsulting.com.br
2. Cloudflare Access redireciona pra Google login
3. Login com email autorizado → dashboard carrega
4. Filtros, KPIs, modal lead+criativo funcionam
5. Push qualquer alteração em `server/` → GitHub Actions deploya em 3min
6. Push qualquer alteração em `web/` → Cloudflare Pages deploya em 1min
7. Amanhã 9h o sync roda sozinho via Cloud Scheduler

---

## Troubleshooting comum

| Erro | Causa | Fix |
|---|---|---|
| `permission denied` no setup-gcp.sh | usuário não tem Owner/Editor | Pede admin do GCP pra te promover |
| `bq command not found` | usando shell que não é Cloud Shell | Vai pra Cloud Shell (já tem bq) |
| Build no Cloud Run falha | Dockerfile/contexto errado | `gcloud builds log <BUILD_ID>` mostra detalhe |
| GitHub Actions falha autenticação | Secret WIF errado | Confere se os 3 valores no GH bate com o que setup-gcp.sh imprimiu |
| Cloudflare Pages: site em branco | `VITE_API_BASE_URL` não setado | Adiciona env var e refaz build |
| Cloudflare Access: loop redirect | Application domain errado | Confere se bate exatamente com `bioma.razconsulting.com.br` |
| Cron não roda | Time zone errado | `--time-zone="America/Sao_Paulo"` (exato) |

---

## Estimativa de custo

- Cloud Run: **$0** (free tier 2M req/mês, scale-to-zero)
- BigQuery: **$0-5/mês** (queries cacheadas 10min + 1 sync diário)
- Cloud Scheduler: **$0** (3 jobs free tier)
- Cloudflare Pages + Access: **$0** (até 50 users)
- Artifact Registry: **$0** (free tier 0.5GB storage)
- **Total: ~$0-5/mês** (provavelmente $0 nos primeiros meses)
