import { tbl } from "../config.js";

export function buildPerformanceQuery({ from, to, emps, statuses }) {
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
