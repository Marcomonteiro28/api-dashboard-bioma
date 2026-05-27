import { tbl } from "../config.js";

export function buildStatusQuery({ emps }) {
  const params = {};
  const types = {};
  const where = emps ? "WHERE empreendimento IN UNNEST(@emps)" : "";
  if (emps) {
    params.emps = emps;
    types.emps = ["STRING"];
  }

  const sql = `
    SELECT
      status, stage_rank, funil, pipeline,
      SUM(qtd) AS qtd
    FROM ${tbl("vw_status_atual")}
    ${where}
    GROUP BY status, stage_rank, funil, pipeline
    ORDER BY stage_rank ASC
  `;

  return { sql, params, types };
}
