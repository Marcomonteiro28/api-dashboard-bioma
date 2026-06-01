import { config } from "../config.js";

const insightsTbl = "`" + config.project + "." + config.gads.dataset + ".gads_insights_daily`";
const campaignsTbl = "`" + config.project + "." + config.gads.dataset + ".gads_campaigns`";
const attribView = "`" + config.project + "." + config.gads.dataset + ".vw_gads_campaign_attribution`";

// Helper genérico — se a tabela gads_insights_daily não existir ainda
// (antes da primeira sync), as queries vão falhar com erro de tabela. Os
// endpoints tratam isso retornando array vazio + warning no log.

export function buildGadsOverviewQuery({ from, to, emps }) {
  const params = { from, to };
  const types = {};
  const conds = ["i.date BETWEEN @from AND @to"];
  let empFilter = "";

  if (emps) {
    empFilter = "AND a.empreendimento IN UNNEST(@emps)";
    params.emps = emps;
    types.emps = ["STRING"];
  }

  const sql = `
    SELECT
      c.id AS campaign_id,
      c.customer_id,
      c.name AS campaign_name,
      c.status,
      c.advertising_channel_type AS channel,
      a.empreendimento,
      SUM(i.cost_brl) AS gasto_brl,
      SUM(i.impressions) AS impressoes,
      SUM(i.clicks) AS cliques,
      SUM(i.conversions) AS conversoes,
      SUM(i.conversion_value_brl) AS conversion_value_brl,
      COUNT(DISTINCT i.date) AS dias_ativos,
      MIN(i.date) AS primeira_data,
      MAX(i.date) AS ultima_data,
      SAFE_DIVIDE(SUM(i.cost_brl), NULLIF(SUM(i.clicks), 0)) AS cpc_brl,
      SAFE_DIVIDE(SUM(i.clicks), NULLIF(SUM(i.impressions), 0)) * 100 AS ctr_pct,
      SAFE_DIVIDE(SUM(i.cost_brl), NULLIF(SUM(i.impressions), 0)) * 1000 AS cpm_brl,
      SAFE_DIVIDE(SUM(i.cost_brl), NULLIF(SUM(i.conversions), 0)) AS cpa_brl
    FROM ${insightsTbl} i
    JOIN ${campaignsTbl} c ON c.id = i.campaign_id
    JOIN ${attribView} a ON a.campaign_id = i.campaign_id
    WHERE ${conds.join(" AND ")}
    ${empFilter}
    GROUP BY campaign_id, customer_id, campaign_name, status, channel, empreendimento
    ORDER BY gasto_brl DESC NULLS LAST
  `;

  return { sql, params, types };
}

export function buildGadsByEmpQuery({ from, to, emps }) {
  const params = { from, to };
  const types = {};
  const conds = ["i.date BETWEEN @from AND @to"];
  let empFilter = "";

  if (emps) {
    empFilter = "AND a.empreendimento IN UNNEST(@emps)";
    params.emps = emps;
    types.emps = ["STRING"];
  }

  const sql = `
    SELECT
      a.empreendimento,
      COUNT(DISTINCT i.campaign_id) AS campanhas_ativas,
      SUM(i.cost_brl) AS gasto_brl,
      SUM(i.impressions) AS impressoes,
      SUM(i.clicks) AS cliques,
      SUM(i.conversions) AS conversoes,
      SUM(i.conversion_value_brl) AS conversion_value_brl,
      COUNT(DISTINCT i.date) AS dias_ativos,
      SAFE_DIVIDE(SUM(i.cost_brl), NULLIF(SUM(i.clicks), 0)) AS cpc_brl,
      SAFE_DIVIDE(SUM(i.clicks), NULLIF(SUM(i.impressions), 0)) * 100 AS ctr_pct,
      SAFE_DIVIDE(SUM(i.cost_brl), NULLIF(SUM(i.impressions), 0)) * 1000 AS cpm_brl,
      SAFE_DIVIDE(SUM(i.cost_brl), NULLIF(SUM(i.conversions), 0)) AS cpa_brl
    FROM ${insightsTbl} i
    JOIN ${attribView} a ON a.campaign_id = i.campaign_id
    WHERE ${conds.join(" AND ")}
    ${empFilter}
    GROUP BY empreendimento
    ORDER BY gasto_brl DESC NULLS LAST
  `;

  return { sql, params, types };
}

/**
 * Visão UNIFICADA Meta + Google Ads por empreendimento.
 * Soma gasto/impressões/cliques de ambas as plataformas.
 * Inclui breakdown opcional pra ver quanto vem de cada.
 */
export function buildMediaPagaByEmpQuery({ from, to, emps }) {
  const metaView = "`" + config.project + "." + config.meta.dataset + ".vw_meta_spend_daily_emp`";
  const gadsView = "`" + config.project + "." + config.gads.dataset + ".vw_gads_spend_daily_emp`";

  const params = { from, to };
  const types = {};
  const empFilter = emps ? "AND empreendimento IN UNNEST(@emps)" : "";
  if (emps) {
    params.emps = emps;
    types.emps = ["STRING"];
  }

  const sql = `
    WITH meta AS (
      SELECT
        empreendimento,
        SUM(gasto_brl) AS gasto_meta,
        SUM(impressoes) AS impr_meta,
        SUM(cliques) AS cliques_meta
      FROM ${metaView}
      WHERE dt BETWEEN @from AND @to ${empFilter}
      GROUP BY empreendimento
    ),
    gads AS (
      SELECT
        empreendimento,
        SUM(gasto_brl) AS gasto_gads,
        SUM(impressoes) AS impr_gads,
        SUM(cliques) AS cliques_gads,
        SUM(conversoes) AS conv_gads
      FROM ${gadsView}
      WHERE dt BETWEEN @from AND @to ${empFilter}
      GROUP BY empreendimento
    )
    SELECT
      COALESCE(meta.empreendimento, gads.empreendimento) AS empreendimento,
      COALESCE(meta.gasto_meta, 0) AS gasto_meta_brl,
      COALESCE(gads.gasto_gads, 0) AS gasto_gads_brl,
      COALESCE(meta.gasto_meta, 0) + COALESCE(gads.gasto_gads, 0) AS gasto_total_brl,
      COALESCE(meta.impr_meta, 0) AS impr_meta,
      COALESCE(gads.impr_gads, 0) AS impr_gads,
      COALESCE(meta.impr_meta, 0) + COALESCE(gads.impr_gads, 0) AS impr_total,
      COALESCE(meta.cliques_meta, 0) AS cliques_meta,
      COALESCE(gads.cliques_gads, 0) AS cliques_gads,
      COALESCE(meta.cliques_meta, 0) + COALESCE(gads.cliques_gads, 0) AS cliques_total,
      COALESCE(gads.conv_gads, 0) AS conv_gads,
      SAFE_DIVIDE(
        COALESCE(meta.gasto_meta, 0) + COALESCE(gads.gasto_gads, 0),
        NULLIF(COALESCE(meta.cliques_meta, 0) + COALESCE(gads.cliques_gads, 0), 0)
      ) AS cpc_total_brl,
      SAFE_DIVIDE(
        COALESCE(meta.cliques_meta, 0) + COALESCE(gads.cliques_gads, 0),
        NULLIF(COALESCE(meta.impr_meta, 0) + COALESCE(gads.impr_gads, 0), 0)
      ) * 100 AS ctr_total_pct
    FROM meta
    FULL OUTER JOIN gads USING (empreendimento)
    WHERE COALESCE(meta.empreendimento, gads.empreendimento) IS NOT NULL
    ORDER BY gasto_total_brl DESC NULLS LAST
  `;

  return { sql, params, types };
}
