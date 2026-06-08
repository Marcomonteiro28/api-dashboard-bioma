import { config } from "../config.js";
import { applySubOrigensFilter } from "./performance.js";

const LEAD_SOURCE_VIEW = "`" + config.project + "." + config.meta.dataset + ".vw_lead_source`";

export function buildLeadsWeeklyQuery({ from, to, emps, statuses, subOrigens }) {
  const conds = ["DATE(dt_entrada) BETWEEN @from AND @to"];
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
      FORMAT_DATE('%Y-%m-%d', DATE_TRUNC(DATE(dt_entrada), WEEK(MONDAY))) AS semana,
      COUNT(DISTINCT deal_id) AS leads,
      COUNT(DISTINCT IF(is_qualificado = 1, deal_id, NULL)) AS qualificados,
      COUNT(DISTINCT IF(is_visita = 1, deal_id, NULL)) AS visitas,
      COUNT(DISTINCT IF(is_ganho = 1, deal_id, NULL)) AS ganhos
    FROM ${LEAD_SOURCE_VIEW}
    WHERE ${conds.join(" AND ")}
    GROUP BY semana
    ORDER BY semana ASC
  `;

  return { sql, params, types };
}
