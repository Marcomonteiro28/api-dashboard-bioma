import { tbl } from "../config.js";

export function buildLeadsWeeklyQuery({ from, to, emps, statuses, subOrigens }) {
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
  if (subOrigens) {
    conds.push("sub_origem IN UNNEST(@sub_origens)");
    params.sub_origens = subOrigens;
    types.sub_origens = ["STRING"];
  }

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m-%d', DATE_TRUNC(DATE(deal_created_at), WEEK(MONDAY))) AS semana,
      COUNT(DISTINCT deal_id) AS leads,
      COUNT(DISTINCT IF(is_qualificado = 1, deal_id, NULL)) AS qualificados,
      COUNT(DISTINCT IF(is_visita = 1, deal_id, NULL)) AS visitas,
      COUNT(DISTINCT IF(is_ganho = 1, deal_id, NULL)) AS ganhos
    FROM ${tbl("stg_crm_deals")}
    WHERE ${conds.join(" AND ")}
    GROUP BY semana
    ORDER BY semana ASC
  `;

  return { sql, params, types };
}
