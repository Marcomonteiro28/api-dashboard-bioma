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

const NORM_FN = (col) => `LOWER(REGEXP_REPLACE(NORMALIZE(${col}, NFD), r'\\p{Mn}', ''))`;

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

  vw_meta_ads_norm: `
    SELECT
      id AS ad_id,
      adset_id,
      campaign_id,
      name AS ad_name,
      ${NORM_FN("name")} AS ad_name_norm,
      effective_status
    FROM ${tableRef("meta_ads")}
    WHERE name IS NOT NULL
  `,

  vw_lead_creative: `
    SELECT
      d.deal_id,
      d.empreendimento,
      d.status,
      d.campanha_deal,
      d.criativo_deal,
      ${NORM_FN("d.criativo_deal")} AS criativo_norm,
      ${NORM_FN("d.campanha_deal")} AS campanha_norm,
      d.dt_entrada,
      d.dt_qualificado,
      d.dt_visita_agendada,
      d.dt_visita_realizada,
      d.dt_fechamento,
      d.valor,
      a.ad_id AS matched_ad_id,
      a.campaign_id AS matched_campaign_id,
      c.name AS matched_campaign_name,
      CASE
        WHEN a.ad_id IS NOT NULL THEN 'AD_NAME'
        WHEN c.id IS NOT NULL THEN 'CAMPAIGN_NAME'
        ELSE 'NO_MATCH'
      END AS match_type
    FROM ${tableRef("crm_deals_csv")} d
    LEFT JOIN ${viewName("vw_meta_ads_norm")} a
      ON a.ad_name_norm = ${NORM_FN("d.criativo_deal")}
    LEFT JOIN ${tableRef("meta_campaigns")} c
      ON ${NORM_FN("c.name")} = ${NORM_FN("d.campanha_deal")}
      AND a.ad_id IS NULL
    WHERE d.criativo_deal IS NOT NULL OR d.campanha_deal IS NOT NULL
  `,

  vw_creative_performance: `
    SELECT
      COALESCE(criativo_deal, '(sem criativo)') AS criativo,
      ANY_VALUE(matched_ad_id) AS ad_id,
      ANY_VALUE(matched_campaign_id) AS campaign_id,
      ANY_VALUE(match_type) AS match_type,
      empreendimento,
      COUNT(DISTINCT deal_id) AS leads,
      COUNT(DISTINCT IF(dt_qualificado IS NOT NULL, deal_id, NULL)) AS qualificados,
      COUNT(DISTINCT IF(dt_visita_agendada IS NOT NULL, deal_id, NULL)) AS agendamentos,
      COUNT(DISTINCT IF(dt_visita_realizada IS NOT NULL, deal_id, NULL)) AS visitas,
      COUNT(DISTINCT IF(LOWER(status) LIKE '%ganh%', deal_id, NULL)) AS ganhos,
      COUNT(DISTINCT IF(LOWER(status) LIKE '%perd%', deal_id, NULL)) AS perdidos
    FROM ${viewName("vw_lead_creative")}
    GROUP BY criativo, empreendimento
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
