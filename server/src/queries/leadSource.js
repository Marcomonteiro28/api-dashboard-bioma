import { config } from "../config.js";
import { applySubOrigensFilter } from "./performance.js";

const view = "`" + config.project + "." + config.meta.dataset + ".vw_lead_source`";

/**
 * Breakdown de leads por fonte (meta/google/google_proxy/externo_*).
 * Cada linha tem o funil completo: leads → qualif → agend → visitas → ganhos.
 * Suporta filtros de empreendimento, status e sub-origem.
 */
export function buildSourceBreakdownQuery({ from, to, emps, statuses, subOrigens }) {
  const params = { from, to };
  const types = {};
  const conds = ["DATE(dt_entrada) BETWEEN @from AND @to"];

  if (emps) {
    conds.push("empreendimento IN UNNEST(@emps)");
    params.emps = emps;
    types.emps = ["STRING"];
  }
  if (statuses) {
    conds.push("CAST(status AS INT64) IN UNNEST(@statuses)");
    params.statuses = statuses;
    types.statuses = ["INT64"];
  }
  applySubOrigensFilter(conds, params, types, subOrigens);

  const sql = `
    SELECT
      fonte,
      COUNT(DISTINCT deal_id) AS leads,
      COUNT(DISTINCT contact_id) AS contatos_unicos,
      COUNT(DISTINCT IF(dt_qualificado IS NOT NULL, deal_id, NULL)) AS qualificados,
      COUNT(DISTINCT IF(dt_visita_agendada IS NOT NULL, deal_id, NULL)) AS agendamentos,
      COUNT(DISTINCT IF(dt_visita_realizada IS NOT NULL, deal_id, NULL)) AS visitas,
      COUNT(DISTINCT IF(status = 1, deal_id, NULL)) AS ganhos,
      COUNTIF(fonte_confianca = 'alta') AS confianca_alta,
      COUNTIF(fonte_confianca = 'media') AS confianca_media,
      COUNTIF(fonte_confianca = 'baixa') AS confianca_baixa,
      SAFE_DIVIDE(
        COUNT(DISTINCT IF(dt_qualificado IS NOT NULL, deal_id, NULL)),
        COUNT(DISTINCT deal_id)
      ) * 100 AS pct_qualif,
      SAFE_DIVIDE(
        COUNT(DISTINCT IF(dt_visita_realizada IS NOT NULL, deal_id, NULL)),
        COUNT(DISTINCT deal_id)
      ) * 100 AS pct_visita
    FROM ${view}
    WHERE ${conds.join(" AND ")}
    GROUP BY fonte
    ORDER BY leads DESC
  `;

  return { sql, params, types };
}

/**
 * Breakdown por fonte × empreendimento — pra ver onde cada fonte mais entrega leads.
 */
export function buildSourceByEmpQuery({ from, to, emps, statuses, subOrigens }) {
  const params = { from, to };
  const types = {};
  const conds = ["DATE(dt_entrada) BETWEEN @from AND @to"];

  if (emps) {
    conds.push("empreendimento IN UNNEST(@emps)");
    params.emps = emps;
    types.emps = ["STRING"];
  }
  if (statuses) {
    conds.push("CAST(status AS INT64) IN UNNEST(@statuses)");
    params.statuses = statuses;
    types.statuses = ["INT64"];
  }
  applySubOrigensFilter(conds, params, types, subOrigens);

  const sql = `
    SELECT
      empreendimento,
      fonte,
      COUNT(DISTINCT deal_id) AS leads,
      COUNT(DISTINCT contact_id) AS contatos_unicos,
      COUNT(DISTINCT IF(dt_qualificado IS NOT NULL, deal_id, NULL)) AS qualificados,
      COUNT(DISTINCT IF(dt_visita_realizada IS NOT NULL, deal_id, NULL)) AS visitas,
      COUNT(DISTINCT IF(status = 1, deal_id, NULL)) AS ganhos
    FROM ${view}
    WHERE ${conds.join(" AND ")}
      AND empreendimento IS NOT NULL
    GROUP BY empreendimento, fonte
    ORDER BY empreendimento, leads DESC
  `;

  return { sql, params, types };
}
