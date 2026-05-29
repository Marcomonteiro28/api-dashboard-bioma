import { tbl } from "../config.js";

export function buildSubOrigensQuery() {
  const sql = `
    SELECT DISTINCT sub_origem
    FROM ${tbl("stg_crm_deals")}
    WHERE sub_origem IS NOT NULL AND sub_origem != ''
    ORDER BY sub_origem ASC
  `;
  return { sql, params: {}, types: {} };
}
