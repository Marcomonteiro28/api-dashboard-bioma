import { config } from "../config.js";

const crmTbl = "`" + config.project + "." + config.dataset + ".stg_crm_deals`";
const metaView = "`" + config.project + "." + config.meta.dataset + ".vw_meta_spend_daily_emp`";

export function buildAttributionQuery({ from, to, emps, statuses, subOrigens }) {
  const crmConds = ["DATE(deal_created_at) BETWEEN @from AND @to"];
  const params = { from, to };
  const types = {};

  if (emps) {
    crmConds.push("empreendimento IN UNNEST(@emps)");
    params.emps = emps;
    types.emps = ["STRING"];
  }
  if (statuses) {
    crmConds.push("CAST(deal_status AS INT64) IN UNNEST(@statuses)");
    params.statuses = statuses;
    types.statuses = ["INT64"];
  }
  if (subOrigens) {
    crmConds.push("sub_origem IN UNNEST(@sub_origens)");
    params.sub_origens = subOrigens;
    types.sub_origens = ["STRING"];
  }

  const metaEmpFilter = emps ? "WHERE empreendimento IN UNNEST(@emps)" : "";

  const sql = `
    WITH crm AS (
      SELECT
        empreendimento,
        COUNT(DISTINCT deal_id) AS leads,
        COUNT(DISTINCT contact_id) AS contatos_unicos,
        SUM(is_qualificado) AS qualificados,
        SUM(is_agendamento) AS agendamentos,
        SUM(is_visita) AS visitas,
        SUM(is_negociacao) AS negociacoes,
        SUM(is_ganho) AS ganhos,
        SUM(IF(is_ganho = 1, valor_deal, 0)) AS receita_brl
      FROM ${crmTbl}
      WHERE ${crmConds.join(" AND ")}
      GROUP BY empreendimento
    ),
    meta AS (
      SELECT
        empreendimento,
        SUM(gasto_brl) AS gasto_meta_brl,
        SUM(impressoes) AS impressoes,
        SUM(cliques) AS cliques,
        COUNT(DISTINCT dt) AS dias_ativos
      FROM ${metaView}
      WHERE dt BETWEEN @from AND @to
      ${metaEmpFilter}
      GROUP BY empreendimento
    )
    SELECT
      COALESCE(crm.empreendimento, meta.empreendimento) AS empreendimento,
      COALESCE(crm.leads, 0) AS leads,
      COALESCE(crm.qualificados, 0) AS qualificados,
      COALESCE(crm.agendamentos, 0) AS agendamentos,
      COALESCE(crm.visitas, 0) AS visitas,
      COALESCE(crm.negociacoes, 0) AS negociacoes,
      COALESCE(crm.ganhos, 0) AS ganhos,
      COALESCE(crm.receita_brl, 0) AS receita_brl,
      COALESCE(meta.gasto_meta_brl, 0) AS gasto_meta_brl,
      COALESCE(meta.impressoes, 0) AS impressoes,
      COALESCE(meta.cliques, 0) AS cliques,
      COALESCE(meta.dias_ativos, 0) AS dias_ativos,
      SAFE_DIVIDE(meta.gasto_meta_brl, NULLIF(crm.leads, 0)) AS cpl_brl,
      SAFE_DIVIDE(meta.gasto_meta_brl, NULLIF(crm.qualificados, 0)) AS cpq_brl,
      SAFE_DIVIDE(meta.gasto_meta_brl, NULLIF(crm.visitas, 0)) AS cpv_brl,
      SAFE_DIVIDE(meta.cliques, NULLIF(meta.impressoes, 0)) * 100 AS ctr_pct,
      SAFE_DIVIDE(meta.gasto_meta_brl, NULLIF(meta.cliques, 0)) AS cpc_brl
    FROM crm
    FULL OUTER JOIN meta USING (empreendimento)
    WHERE COALESCE(crm.empreendimento, meta.empreendimento) IS NOT NULL
    ORDER BY gasto_meta_brl DESC NULLS LAST, leads DESC
  `;

  return { sql, params, types };
}

export function buildMetaSpendDailyQuery({ from, to, emps }) {
  const params = { from, to };
  const types = {};
  const conds = ["dt BETWEEN @from AND @to"];
  if (emps) {
    conds.push("empreendimento IN UNNEST(@emps)");
    params.emps = emps;
    types.emps = ["STRING"];
  }
  const sql = `
    SELECT
      dt,
      empreendimento,
      SUM(gasto_brl) AS gasto_brl,
      SUM(impressoes) AS impressoes,
      SUM(cliques) AS cliques
    FROM ${metaView}
    WHERE ${conds.join(" AND ")}
    GROUP BY dt, empreendimento
    ORDER BY dt DESC, empreendimento ASC
  `;
  return { sql, params, types };
}
