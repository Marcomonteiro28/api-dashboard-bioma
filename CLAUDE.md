# api-dashboard-bioma

Dashboard local de funil CRM + atribuição de campanhas Meta pra **Bioma Incorporadora** (cliente). Marca em destaque: **Casa Vertical**. Gerenciado pela **RazConsulting** (agência do Marco).

## Stack

- **CRM**: ActiveCampaign — pré-vendas + vendas, deals com flags `is_qualificado`, `is_agendamento`, `is_visita`, `is_negociacao`, `is_ganho`
- **ETL legado**: Kondado (SaaS BR) — sincroniza AC → BigQuery uma vez por dia, **com lag em custom fields**
- **ETL próprio (este repo)**: jobs Node que puxam direto da API do AC e Meta → BQ a cada 9h Brasília (Windows Task Scheduler)
- **DW**: BigQuery, projeto `kondado-bioma`
  - `crm_marts` (gerenciado pela Kondado): `stg_crm_deals`, `vw_status_atual`, `fct_funil_diario`
  - `raw_data` (Kondado): tabelas `activecampaign_*` brutas
  - `bioma_meta` (criado por este projeto): `meta_*`, `ac_*`, `vw_*` (atribuição)
- **Backend**: Node 20+ ESM, Express 5
- **Frontend**: HTML+JS+CSS vanilla em `dashboard.html` (porte React+Vite+TS planejado em Fase 2)

## Estrutura

```
server/src/
├── index.js              boot do Express
├── config.js             env vars + defaults
├── bq.js                 cliente BQ + cache 10min
├── bq-load.js            helpers replaceTableLoad / appendDateWindow (load jobs)
├── lib/
│   ├── cacheKey.js       chave canônica (arrays/keys ordenados)
│   └── parseFilters.js   validação de from/to/empreendimentos/status/limit
├── middleware/
│   ├── logger.js         JSON com requestId, durationMs, kind
│   ├── rateLimit.js      120 req/min por IP (configurável)
│   └── errorHandler.js
├── queries/              SQL builders puros
│   ├── performance.js
│   ├── status.js
│   ├── empreendimentos.js
│   ├── deals.js
│   ├── attribution.js
│   └── creativeAttribution.js
├── routes/               Express routers
│   ├── health.js
│   ├── empreendimentos.js
│   ├── performance.js
│   ├── status.js
│   ├── deals.js
│   ├── attribution.js
│   └── creativeAttribution.js
├── meta/                 integração Meta Ads
│   ├── client.js         fetch wrapper c/ paginação
│   ├── schemas.js        schemas BQ + lista de fields
│   ├── views.js          definições das views BQ
│   └── loaders.js        syncCampaigns/Adsets/Ads/Creatives/Insights
├── ac/                   integração ActiveCampaign API
│   ├── client.js         fetch wrapper c/ paginação + rate limit (250ms)
│   ├── schemas.js        schemas BQ
│   └── loaders.js        syncDealCustomFieldsMeta/Deals/Data (load jobs)
└── jobs/
    ├── sync-meta.js      orquestrador Meta (npm run sync:meta)
    ├── sync-ac.js        orquestrador AC (npm run sync:ac)
    ├── apply-meta-views.js   CREATE OR REPLACE das views
    ├── import-csv-deals.js   import de CSV exportado do AC (legado)
    └── check-*.js / inspect-*.js / debug-*.js   scripts de diagnóstico
```

## Comandos

```bash
npm start              # Express em http://localhost:3001
npm run dev            # mesmo com --watch
npm run sync:meta      # puxa Meta Ads -> BQ (~2min)
npm run sync:ac        # puxa AC -> BQ (~4min)
npm run sync:all       # sync:ac + sync:meta + apply:meta-views
npm run apply:meta-views   # CREATE OR REPLACE das views BQ
npm run import:csv-deals "C:\caminho\export.csv"   # legado, prefira sync:ac
```

## Configuração (`.env`)

Variáveis obrigatórias:
- `GCP_PROJECT_ID=kondado-bioma`
- `BQ_DATASET=crm_marts` (legado da Kondado)
- `BQ_LOCATION=southamerica-east1`
- `GOOGLE_APPLICATION_CREDENTIALS=./service-account.json` (SA `dashboard-api-reader@kondado-bioma.iam.gserviceaccount.com`)
- `META_ACCESS_TOKEN=<token>` (System User "Bioma API Integracao")
- `META_AD_ACCOUNT_IDS=act_X,act_Y,act_Z` (csv) — atualmente as 3 contas Bioma
- `META_BQ_DATASET=bioma_meta`
- `AC_API_URL=https://biomainc.api-us1.com`
- `AC_API_TOKEN=<token>`
- `AC_BQ_DATASET=bioma_meta`

**Tokens NUNCA devem ir para o chat ou para git** — apenas no `.env` (já no `.gitignore`). `service-account.json` também é gitignored.

## Convenções importantes

**Nomenclatura das campanhas Meta** (descoberta em 2026-05-27, com cobertura 100%):
```
RZ - <Objetivo> - <Empreendimento> <data DD-MM>
```
- `RZ` = RazConsulting
- `<Objetivo>` = `Form` (lead form), `ThruPlays` (video views), etc.
- `<Empreendimento>` = "CV Apinajés", "Morá Alto da Lapa", "Fradique", "JML", "Simpatia", ou marca/institucional

Atribuição extrai empreendimento via regex em `vw_meta_campaign_attribution`. Drift na convenção quebra atribuição — incluir log de campanhas não identificadas se notar regressão.

**Status do deal**: `0=Aberto`, `1=Ganho`, `2=Perdido` (no AC). No BQ `stg_crm_deals.deal_status` é `FLOAT64` (coerção da Kondado) — queries usam `CAST(deal_status AS INT64)`.

**Custom fields do AC pivotados em `vw_ac_deals_enriched`**: lookup por `field_label` (não ID) — IDs são instáveis entre o export Kondado e a API direta. Campos chave: `empreendimento`, `criativo_deal`, `campanha_deal`, `lt_utm_campaign`, `lt_utm_content`, `dt_qualificado`, `dt_visita_*`, `dt_fechamento`.

**Match Meta ↔ AC**: `vw_lead_creative` faz JOIN normalizado (lowercased + sem acento) entre `criativo_deal` do AC e `meta_ads.name`. Quando não bate, tenta `campanha_deal` × `meta_campaigns.name`. Última camada `NO_MATCH` cobre audiences/lookalikes.

## Endpoints

| Path | Retorna |
|---|---|
| `GET /health` | `{status, bq}` — testa conexão BQ |
| `GET /api/empreendimentos` | lista distinta |
| `GET /api/performance-emp?from=&to=&empreendimentos=&status=` | métricas por empreendimento |
| `GET /api/status-atual?empreendimentos=` | fila de pré-vendas + vendas (view BQ) |
| `GET /api/deals?from=&to=&empreendimentos=&status=&estagio=&limit=` | drill-down (max 5000) |
| `GET /api/attribution-emp?from=&to=&empreendimentos=&status=` | leads CRM × gasto Meta por empreendimento |
| `GET /api/attribution-creative?from=&to=&empreendimentos=` | top criativos por leads/CPL |
| `GET /api/meta/spend-daily?from=&to=&empreendimentos=` | série diária de gasto |

Filtros aceitam `YYYY-MM-DD`; cache 10min por chave canônica; rate limit 120/min/IP.

## Estado das fases

| # | Fase | Status |
|---|---|---|
| 0 | git init + .gitignore | ✅ |
| 1 | endurecer backend (modularização, CORS, validação, logs, rate limit) | ✅ |
| 1.5 | tema Casa Vertical no dashboard.html | ✅ |
| A | sync Meta Ads → BQ | ✅ |
| A.2 | multi-account (3 contas Bioma) | ✅ |
| B | atribuição por empreendimento | ✅ |
| B.1 | atribuição por criativo via CSV (legado) | ✅ |
| AC | sync ActiveCampaign API → BQ | ✅ |
| cron | sync-daily.ps1 + Task Scheduler 9h Brasília | ✅ |
| 2 | migrar frontend React + Vite + TS | pendente |
| 3 | este CLAUDE.md | ✅ |
| C | App Review Meta + Lead Ads sync | bloqueado em review |
| D | Conversions API (server-side) | depende de B+C |

## Cron

Task Scheduler `Bioma Dashboard Sync Daily` roda `scripts/sync-daily.ps1` todo dia 09:00 horário local. PC precisa estar ligado (ou o Task Scheduler dispara quando ligar, via `-StartWhenAvailable`).

Gerenciar:
```powershell
Start-ScheduledTask -TaskName "Bioma Dashboard Sync Daily"      # disparar
Get-ScheduledTaskInfo -TaskName "Bioma Dashboard Sync Daily"    # status
.\scripts\install-cron.ps1                                       # reinstalar
Unregister-ScheduledTask -TaskName "Bioma Dashboard Sync Daily" -Confirm:$false   # remover
```

Logs em `logs/sync-YYYY-MM-DD.log` (gitignored).

## Decisões de arquitetura importantes

- **Load jobs no BQ, não streaming insert**: `bq-load.js#replaceTableLoad` usa `WRITE_TRUNCATE` via `createWriteStream`. Streaming insert tem buffer interno de 90min onde `DELETE` falha com "would affect rows in streaming buffer".
- **Field labels, não IDs**: `vw_ac_deals_enriched` pivota custom fields por `field_label` porque IDs diferem entre AC API direta e export Kondado.
- **Dataset separado `bioma_meta`**: SA `dashboard-api-reader` tem só leitura em `crm_marts` (Kondado). Tabelas escritas por este projeto vão em `bioma_meta` com role `BigQuery Data Editor`.
- **Cache canônico**: `lib/cacheKey.js` ordena arrays e keys antes de virar chave — `?empreendimentos=A,B` e `?empreendimentos=B,A` viram a mesma chave de cache.
- **CORS allowlist**: default `http://localhost:5173,http://localhost:3001` (Vite + Express). `.env` atual usa `*` que aceita qualquer origem; reduzir em produção.

## Próximos passos

Quando retomar trabalho:
1. Confirma com o user qual fase priorizar — não há ordem fixa
2. Se for Fase 2 (React+Vite+TS), escopo é grande: scaffold em `web/`, replicar componentes mantendo CSS atual, preservar endpoints
3. Se for atribuição refinada (UTMs nativos em vez de field legado): exige coordenação com agência (preencher URL Parameters dos ads no Meta) + dbt do Kondado (promover `lt_utm_*` no `stg_crm_deals`)
4. Tokens Meta e AC no `.env` são revogáveis — sempre orientar usuário a revogar após sessão de debug
