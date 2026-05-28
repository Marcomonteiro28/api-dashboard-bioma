import { config } from "../config.js";

const proj = config.project;
const ds = config.meta.dataset;

export function buildCreativeFunnelQuery({ from, to, emps, minLeads = 5 }) {
  const params = { from, to, min_leads: minLeads };
  const types = { min_leads: "INT64" };
  const empFilter = emps ? "AND empreendimento IN UNNEST(@emps)" : "";
  if (emps) {
    params.emps = emps;
    types.emps = ["STRING"];
  }

  const sql = `
    WITH base AS (
      SELECT
        criativo_deal AS criativo,
        ANY_VALUE(matched_ad_id) AS ad_id,
        ANY_VALUE(matched_campaign_id) AS campaign_id,
        ANY_VALUE(match_type) AS match_type,
        ANY_VALUE(empreendimento) AS empreendimento,
        COUNT(DISTINCT deal_id) AS leads,
        COUNT(DISTINCT IF(dt_qualificado IS NOT NULL, deal_id, NULL)) AS qualificados,
        COUNT(DISTINCT IF(dt_visita_agendada IS NOT NULL, deal_id, NULL)) AS agendamentos,
        COUNT(DISTINCT IF(dt_visita_realizada IS NOT NULL, deal_id, NULL)) AS visitas,
        COUNT(DISTINCT IF(status = 1, deal_id, NULL)) AS ganhos
      FROM \`${proj}.${ds}.vw_lead_creative\`
      WHERE criativo_deal IS NOT NULL
        AND DATE(dt_entrada) BETWEEN @from AND @to
        ${empFilter}
      GROUP BY criativo
      HAVING COUNT(DISTINCT deal_id) >= @min_leads
    ),
    spend AS (
      SELECT
        ad_id,
        SUM(spend) AS gasto_brl,
        SUM(impressions) AS impressoes,
        SUM(clicks) AS cliques
      FROM \`${proj}.${ds}.meta_insights_daily\`
      WHERE date_start BETWEEN @from AND @to AND ad_id IS NOT NULL
      GROUP BY ad_id
    )
    SELECT
      b.criativo,
      b.empreendimento,
      b.match_type,
      b.ad_id,
      b.campaign_id,
      b.leads,
      b.qualificados,
      b.agendamentos,
      b.visitas,
      b.ganhos,
      ROUND(SAFE_DIVIDE(b.qualificados, b.leads) * 100, 1) AS pct_qualif,
      ROUND(SAFE_DIVIDE(b.agendamentos, b.qualificados) * 100, 1) AS pct_qualif_agend,
      ROUND(SAFE_DIVIDE(b.visitas, b.agendamentos) * 100, 1) AS pct_agend_visit,
      ROUND(SAFE_DIVIDE(b.ganhos, b.leads) * 100, 1) AS pct_ganho,
      ROUND(SAFE_DIVIDE(b.visitas * 3 + b.agendamentos, b.leads) * 100, 1) AS progression_score,
      COALESCE(s.gasto_brl, 0) AS gasto_brl,
      COALESCE(s.impressoes, 0) AS impressoes,
      COALESCE(s.cliques, 0) AS cliques,
      ROUND(SAFE_DIVIDE(s.gasto_brl, NULLIF(b.visitas, 0)), 2) AS custo_por_visita_brl,
      ROUND(SAFE_DIVIDE(s.gasto_brl, NULLIF(b.agendamentos, 0)), 2) AS custo_por_agend_brl
    FROM base b
    LEFT JOIN spend s USING (ad_id)
    ORDER BY progression_score DESC, b.leads DESC
    LIMIT 25
  `;

  return { sql, params, types };
}
