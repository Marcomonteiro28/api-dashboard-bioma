import { tbl } from "../config.js";

export const NULL_SUB_ORIGEM_TOKEN = "(Sem sub-origem)";

export function applySubOrigensFilter(conds, params, types, subOrigens) {
  if (!subOrigens) return;
  const hasNullToken = subOrigens.includes(NULL_SUB_ORIGEM_TOKEN);
  const concretos = subOrigens.filter((s) => s !== NULL_SUB_ORIGEM_TOKEN);
  const parts = [];
  if (hasNullToken) parts.push("(sub_origem IS NULL OR sub_origem = '')");
  if (concretos.length > 0) parts.push("sub_origem IN UNNEST(@sub_origens)");
  if (parts.length === 0) return;
  conds.push(`(${parts.join(" OR ")})`);
  if (concretos.length > 0) {
    params.sub_origens = concretos;
    types.sub_origens = ["STRING"];
  }
}

export function buildPerformanceQuery({ from, to, emps, statuses, subOrigens }) {
  const conds = ["DATE(deal_created_at) BETWEEN @from AND @to"];
  const params = { from, to };
  const types = {};

  if (emps) {
    conds.push("empreendimento IN UNNEST(@emps)");
    params.emps = emps;
    types.emps = ["STRING"];
  }
  if (statuses) {
    conds.push("CAST(deal_status AS INT64) IN UNNEST(@statuses)");
    params.statuses = statuses;
    types.statuses = ["INT64"];
  }
  applySubOrigensFilter(conds, params, types, subOrigens);

  const sql = `
    SELECT
      empreendimento,
      COUNT(DISTINCT deal_id)        AS leads,
      COUNT(DISTINCT contact_id)     AS contatos_unicos,
      SUM(is_aguardando_retorno)     AS aguardando_retorno,
      SUM(is_qualificado)            AS qualificados,
      SUM(is_agendamento)            AS agendamentos,
      SUM(is_transferido)            AS transferidos,
      SUM(is_visita_confirmada)      AS visitas_confirmadas,
      SUM(is_visita)                 AS visitas,
      SUM(is_negociacao)             AS negociacoes,
      SUM(is_proposta)               AS propostas,
      SUM(is_ganho)                  AS ganhos,
      SUM(IF(is_ganho = 1, valor_deal, 0)) AS receita_ganha
    FROM ${tbl("stg_crm_deals")}
    WHERE ${conds.join(" AND ")}
    GROUP BY empreendimento
    ORDER BY leads DESC
  `;

  return { sql, params, types };
}

export function buildPerformanceTotalsQuery({ from, to, emps, statuses, subOrigens }) {
  const conds = ["DATE(deal_created_at) BETWEEN @from AND @to"];
  const params = { from, to };
  const types = {};

  if (emps) {
    conds.push("empreendimento IN UNNEST(@emps)");
    params.emps = emps;
    types.emps = ["STRING"];
  }
  if (statuses) {
    conds.push("CAST(deal_status AS INT64) IN UNNEST(@statuses)");
    params.statuses = statuses;
    types.statuses = ["INT64"];
  }
  applySubOrigensFilter(conds, params, types, subOrigens);

  const sql = `
    SELECT
      COUNT(DISTINCT deal_id) AS leads,
      COUNT(DISTINCT contact_id) AS contatos_unicos,
      COUNT(DISTINCT IF(is_aguardando_retorno = 1, deal_id, NULL)) AS aguardando_retorno,
      COUNT(DISTINCT IF(is_qualificado = 1, deal_id, NULL)) AS qualificados,
      COUNT(DISTINCT IF(is_agendamento = 1, deal_id, NULL)) AS agendamentos,
      COUNT(DISTINCT IF(is_transferido = 1, deal_id, NULL)) AS transferidos,
      COUNT(DISTINCT IF(is_visita_confirmada = 1, deal_id, NULL)) AS visitas_confirmadas,
      COUNT(DISTINCT IF(is_visita = 1, deal_id, NULL)) AS visitas,
      COUNT(DISTINCT IF(is_negociacao = 1, deal_id, NULL)) AS negociacoes,
      COUNT(DISTINCT IF(is_proposta = 1, deal_id, NULL)) AS propostas,
      COUNT(DISTINCT IF(is_ganho = 1, deal_id, NULL)) AS ganhos,
      SUM(IF(is_ganho = 1, valor_deal, 0)) AS receita_ganha
    FROM ${tbl("stg_crm_deals")}
    WHERE ${conds.join(" AND ")}
  `;

  return { sql, params, types };
}
