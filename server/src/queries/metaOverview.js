import { config } from "../config.js";

const insightsTbl = "`" + config.project + "." + config.meta.dataset + ".meta_insights_daily`";
const campaignsTbl = "`" + config.project + "." + config.meta.dataset + ".meta_campaigns`";
const attribView = "`" + config.project + "." + config.meta.dataset + ".vw_meta_campaign_attribution`";

/**
 * Visão "Meta puro": dados raw do Meta Ads sem JOIN com CRM.
 * Útil quando o tracking do AC (campos custom criativo_deal, campanha_deal,
 * UTMs) não está 100% preenchido. Mostra o que o Meta efetivamente entregou.
 */
export function buildMetaOverviewQuery({ from, to, emps }) {
  const params = { from, to };
  const types = {};
  const conds = ["i.date_start BETWEEN @from AND @to"];
  let empJoinFilter = "";

  if (emps) {
    empJoinFilter = "AND a.empreendimento IN UNNEST(@emps)";
    params.emps = emps;
    types.emps = ["STRING"];
  }

  // Agrega por campanha (não por dia) — frontend re-agrega por empreendimento/objetivo
  const sql = `
    SELECT
      c.id AS campaign_id,
      c.name AS campaign_name,
      c.effective_status,
      c.objective AS objective_raw,
      a.empreendimento,
      a.objetivo_parsed,
      SUM(i.spend) AS gasto_brl,
      SUM(i.impressions) AS impressoes,
      SUM(i.clicks) AS cliques,
      SUM(i.reach) AS reach,
      SUM(i.conversions) AS conversoes,
      COUNT(DISTINCT i.date_start) AS dias_ativos,
      MIN(i.date_start) AS primeira_data,
      MAX(i.date_start) AS ultima_data,
      SAFE_DIVIDE(SUM(i.spend), NULLIF(SUM(i.clicks), 0)) AS cpc_brl,
      SAFE_DIVIDE(SUM(i.clicks), NULLIF(SUM(i.impressions), 0)) * 100 AS ctr_pct,
      SAFE_DIVIDE(SUM(i.spend), NULLIF(SUM(i.impressions), 0)) * 1000 AS cpm_brl,
      SAFE_DIVIDE(SUM(i.impressions), NULLIF(SUM(i.reach), 0)) AS frequencia,
      SAFE_DIVIDE(SUM(i.spend), NULLIF(SUM(i.conversions), 0)) AS cost_per_conv_brl
    FROM ${insightsTbl} i
    JOIN ${campaignsTbl} c ON c.id = i.campaign_id
    JOIN ${attribView} a ON a.campaign_id = i.campaign_id
    WHERE ${conds.join(" AND ")}
    ${empJoinFilter}
    GROUP BY campaign_id, campaign_name, effective_status, objective_raw, empreendimento, objetivo_parsed
    ORDER BY gasto_brl DESC NULLS LAST
  `;

  return { sql, params, types };
}

/**
 * Resumo agregado por empreendimento direto do Meta (sem cruzar com CRM).
 * Útil pra responder "o quanto rodou em cada empreendimento" mesmo quando
 * leads não foram taggeados no AC.
 */
export function buildMetaByEmpQuery({ from, to, emps }) {
  const params = { from, to };
  const types = {};
  const conds = ["i.date_start BETWEEN @from AND @to"];
  let empJoinFilter = "";

  if (emps) {
    empJoinFilter = "AND a.empreendimento IN UNNEST(@emps)";
    params.emps = emps;
    types.emps = ["STRING"];
  }

  const sql = `
    SELECT
      a.empreendimento,
      COUNT(DISTINCT i.campaign_id) AS campanhas_ativas,
      SUM(i.spend) AS gasto_brl,
      SUM(i.impressions) AS impressoes,
      SUM(i.clicks) AS cliques,
      SUM(i.reach) AS reach,
      SUM(i.conversions) AS conversoes,
      COUNT(DISTINCT i.date_start) AS dias_ativos,
      SAFE_DIVIDE(SUM(i.spend), NULLIF(SUM(i.clicks), 0)) AS cpc_brl,
      SAFE_DIVIDE(SUM(i.clicks), NULLIF(SUM(i.impressions), 0)) * 100 AS ctr_pct,
      SAFE_DIVIDE(SUM(i.spend), NULLIF(SUM(i.impressions), 0)) * 1000 AS cpm_brl,
      SAFE_DIVIDE(SUM(i.spend), NULLIF(SUM(i.conversions), 0)) AS cost_per_conv_brl
    FROM ${insightsTbl} i
    JOIN ${attribView} a ON a.campaign_id = i.campaign_id
    WHERE ${conds.join(" AND ")}
    ${empJoinFilter}
    GROUP BY empreendimento
    ORDER BY gasto_brl DESC NULLS LAST
  `;

  return { sql, params, types };
}

/**
 * Coverage do tracking AC: quantos leads tem criativo_deal/campanha_deal
 * preenchido vs não — base pro user entender as "lacunas" no cross.
 */
export function buildTrackingCoverageQuery({ from, to, emps }) {
  const crmTbl = "`" + config.project + "." + config.dataset + ".stg_crm_deals`";
  const params = { from, to };
  const types = {};
  const conds = ["DATE(d.deal_created_at) BETWEEN @from AND @to"];

  if (emps) {
    conds.push("d.empreendimento IN UNNEST(@emps)");
    params.emps = emps;
    types.emps = ["STRING"];
  }

  // stg_crm_deals tem custom fields como JSON em deal_custom_fields ou em
  // colunas próprias dependendo da versão do staging. Vamos assumir que esses
  // campos viraram colunas (caso comum em fct_funil_diario downstream).
  // Se não existirem como colunas, fallback: usa vw_lead_creative do bioma_meta.
  const enrichedView = "`" + config.project + "." + config.meta.dataset + ".vw_ac_deals_enriched`";

  const sql = `
    SELECT
      COALESCE(e.empreendimento, '(sem empreendimento)') AS empreendimento,
      COUNT(DISTINCT e.deal_id) AS leads_total,
      COUNT(DISTINCT IF(e.criativo_deal IS NOT NULL AND e.criativo_deal != '', e.deal_id, NULL)) AS com_criativo,
      COUNT(DISTINCT IF(e.campanha_deal IS NOT NULL AND e.campanha_deal != '', e.deal_id, NULL)) AS com_campanha,
      COUNT(DISTINCT IF(e.sub_origem IS NOT NULL AND e.sub_origem != '', e.deal_id, NULL)) AS com_sub_origem,
      COUNT(DISTINCT IF(e.lt_utm_campaign IS NOT NULL AND e.lt_utm_campaign != '', e.deal_id, NULL)) AS com_utm
    FROM ${enrichedView} e
    JOIN ${crmTbl} d ON d.deal_id = e.deal_id
    WHERE ${conds.join(" AND ")}
    GROUP BY empreendimento
    ORDER BY leads_total DESC
  `;

  return { sql, params, types };
}
