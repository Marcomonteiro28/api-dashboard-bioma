import { config } from "../config.js";

const ds = config.meta.dataset;
const proj = config.project;

export function buildCreativeAttributionQuery({ from, to, emps }) {
  const params = { from, to };
  const types = {};
  const empFilter = emps ? "AND empreendimento IN UNNEST(@emps)" : "";
  if (emps) {
    params.emps = emps;
    types.emps = ["STRING"];
  }

  const sql = `
    WITH perf AS (
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
        COUNT(DISTINCT IF(LOWER(status) LIKE '%ganh%', deal_id, NULL)) AS ganhos
      FROM \`${proj}.${ds}.vw_lead_creative\`
      WHERE criativo_deal IS NOT NULL
        AND DATE(dt_entrada) BETWEEN @from AND @to
        ${empFilter}
      GROUP BY criativo_deal
    ),
    spend AS (
      SELECT
        ad_id,
        SUM(spend) AS gasto_brl,
        SUM(impressions) AS impressoes,
        SUM(clicks) AS cliques
      FROM \`${proj}.${ds}.meta_insights_daily\`
      WHERE date_start BETWEEN @from AND @to
        AND ad_id IS NOT NULL
      GROUP BY ad_id
    )
    SELECT
      perf.criativo,
      perf.empreendimento,
      perf.match_type,
      perf.ad_id,
      perf.campaign_id,
      perf.leads,
      perf.qualificados,
      perf.agendamentos,
      perf.visitas,
      perf.ganhos,
      COALESCE(spend.gasto_brl, 0) AS gasto_brl,
      COALESCE(spend.impressoes, 0) AS impressoes,
      COALESCE(spend.cliques, 0) AS cliques,
      SAFE_DIVIDE(spend.gasto_brl, NULLIF(perf.leads, 0)) AS cpl_brl,
      SAFE_DIVIDE(spend.gasto_brl, NULLIF(perf.qualificados, 0)) AS cpq_brl,
      SAFE_DIVIDE(spend.cliques, NULLIF(spend.impressoes, 0)) * 100 AS ctr_pct
    FROM perf
    LEFT JOIN spend USING (ad_id)
    ORDER BY perf.leads DESC
    LIMIT 50
  `;

  return { sql, params, types };
}
