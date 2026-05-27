import { BigQuery } from "@google-cloud/bigquery";
import { config } from "../config.js";

const bq = new BigQuery({ projectId: config.project });

function viewName(name) {
  return "`" + config.project + "." + config.meta.dataset + "." + name + "`";
}

function tableRef(name) {
  return "`" + config.project + "." + config.meta.dataset + "." + name + "`";
}

const EMPREENDIMENTO_CASE = `
  CASE
    WHEN REGEXP_CONTAINS(name, r'(?i)alto da lapa') THEN 'Alto da Lapa'
    WHEN REGEXP_CONTAINS(name, r'(?i)apinaj[ée]s|\\bcv\\b apinaj') THEN 'Apinajés'
    WHEN REGEXP_CONTAINS(name, r'(?i)simpatia') THEN 'Simpatia'
    WHEN REGEXP_CONTAINS(name, r'(?i)fradique') THEN 'Fradique'
    WHEN REGEXP_CONTAINS(name, r'(?i)\\bjml\\b') THEN 'JML'
    WHEN REGEXP_CONTAINS(name, r'(?i)\\bbioma\\b|\\bagrs\\b|institucional|lookalike|\\bcasa vertical\\b|\\bmor[áa]\\b') THEN '(Institucional)'
    ELSE NULL
  END
`;

const OBJETIVO_CASE = `
  CASE
    WHEN REGEXP_CONTAINS(name, r'(?i)\\bform\\b') THEN 'Form (Lead)'
    WHEN REGEXP_CONTAINS(name, r'(?i)thruplay|video') THEN 'Video / ThruPlays'
    WHEN REGEXP_CONTAINS(name, r'(?i)\\balc?cance\\b|\\breach\\b') THEN 'Alcance'
    WHEN REGEXP_CONTAINS(name, r'(?i)engaj|engage') THEN 'Engajamento'
    ELSE 'Outros'
  END
`;

export const VIEWS = {
  vw_meta_campaign_attribution: `
    SELECT
      id AS campaign_id,
      name AS campaign_name,
      effective_status,
      objective,
      ${EMPREENDIMENTO_CASE} AS empreendimento,
      ${OBJETIVO_CASE} AS objetivo_parsed
    FROM ${tableRef("meta_campaigns")}
  `,

  vw_meta_spend_daily_emp: `
    SELECT
      i.date_start AS dt,
      a.empreendimento,
      a.objetivo_parsed,
      COUNT(DISTINCT i.campaign_id) AS campanhas_ativas,
      SUM(i.spend) AS gasto_brl,
      SUM(i.impressions) AS impressoes,
      SUM(i.clicks) AS cliques,
      SAFE_DIVIDE(SUM(i.spend), NULLIF(SUM(i.clicks), 0)) AS cpc_brl,
      SAFE_DIVIDE(SUM(i.clicks), NULLIF(SUM(i.impressions), 0)) * 100 AS ctr_pct
    FROM ${tableRef("meta_insights_daily")} i
    JOIN ${viewName("vw_meta_campaign_attribution")} a ON a.campaign_id = i.campaign_id
    WHERE a.empreendimento IS NOT NULL
    GROUP BY dt, a.empreendimento, a.objetivo_parsed
  `,
};

export async function applyViews() {
  for (const [name, body] of Object.entries(VIEWS)) {
    const sql = `CREATE OR REPLACE VIEW ${viewName(name)} AS ${body}`;
    await bq.query({ query: sql, location: config.location });
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      kind: "bq.view_applied",
      view: name,
    }));
  }
}
