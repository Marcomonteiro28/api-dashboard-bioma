import { BigQuery } from "@google-cloud/bigquery";
import { config } from "../config.js";

const bq = new BigQuery({ projectId: config.project });

function viewName(name) {
  return "`" + config.project + "." + config.gads.dataset + "." + name + "`";
}
function tableRef(name) {
  return "`" + config.project + "." + config.gads.dataset + "." + name + "`";
}

// Parser de empreendimento pro Google Ads — convenção é DIFERENTE do Meta.
// Por enquanto, sem parser definido pelo user, retornamos NULL.
// TODO: quando user explicar a lógica, atualizar este CASE.
const GADS_EMPREENDIMENTO_CASE = `
  CASE
    WHEN REGEXP_CONTAINS(c.name, r'(?i)alto da lapa') THEN 'Alto da Lapa'
    WHEN REGEXP_CONTAINS(c.name, r'(?i)apinaj[ée]s|\\bcv\\b apinaj') THEN 'Apinajés'
    WHEN REGEXP_CONTAINS(c.name, r'(?i)simpatia') THEN 'Simpatia'
    WHEN REGEXP_CONTAINS(c.name, r'(?i)fradique') THEN 'Fradique'
    WHEN REGEXP_CONTAINS(c.name, r'(?i)\\bjml\\b') THEN 'JML'
    WHEN REGEXP_CONTAINS(c.name, r'(?i)\\bbioma\\b|institucional|lookalike|\\bcasa vertical\\b|\\bmor[áa]\\b') THEN '(Institucional)'
    ELSE NULL
  END
`;

export const GADS_VIEWS = {
  vw_gads_campaign_attribution: `
    SELECT
      c.id AS campaign_id,
      c.customer_id,
      c.name AS campaign_name,
      c.status,
      c.serving_status,
      c.advertising_channel_type,
      ${GADS_EMPREENDIMENTO_CASE} AS empreendimento
    FROM ${tableRef("gads_campaigns")} c
  `,

  vw_gads_spend_daily_emp: `
    SELECT
      i.date AS dt,
      a.empreendimento,
      a.advertising_channel_type AS channel,
      COUNT(DISTINCT i.campaign_id) AS campanhas_ativas,
      SUM(i.cost_brl) AS gasto_brl,
      SUM(i.impressions) AS impressoes,
      SUM(i.clicks) AS cliques,
      SUM(i.conversions) AS conversoes,
      SUM(i.conversion_value_brl) AS conversion_value_brl,
      SAFE_DIVIDE(SUM(i.cost_brl), NULLIF(SUM(i.clicks), 0)) AS cpc_brl,
      SAFE_DIVIDE(SUM(i.clicks), NULLIF(SUM(i.impressions), 0)) * 100 AS ctr_pct
    FROM ${tableRef("gads_insights_daily")} i
    JOIN ${viewName("vw_gads_campaign_attribution")} a ON a.campaign_id = i.campaign_id
    GROUP BY dt, a.empreendimento, channel
  `,
};

export async function applyGadsViews() {
  for (const [name, body] of Object.entries(GADS_VIEWS)) {
    const sql = `CREATE OR REPLACE VIEW ${viewName(name)} AS ${body}`;
    await bq.query({ query: sql, location: config.location });
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      kind: "bq.view_applied",
      view: name,
    }));
  }
}
