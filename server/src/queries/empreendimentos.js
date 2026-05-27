import { tbl } from "../config.js";

export function buildEmpreendimentosQuery() {
  const sql = `
    SELECT DISTINCT empreendimento
    FROM ${tbl("stg_crm_deals")}
    WHERE empreendimento IS NOT NULL
    ORDER BY empreendimento ASC
  `;
  return { sql, params: {}, types: {} };
}
