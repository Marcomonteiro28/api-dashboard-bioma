import { config } from "../config.js";

// Le de vw_status_atual_live (bioma_meta) baseada na minha sync AC API
// em vez de vw_status_atual (crm_marts/Kondado) que tem dados defasados
// para 9h da manha. emps nao filtra mais (a view nao expoe empreendimento
// e o caso de uso e snapshot global do pipeline).
export function buildStatusQuery() {
  const sql = `
    SELECT status, stage_rank, funil, pipeline, qtd
    FROM \`${config.project}.${config.meta.dataset}.vw_status_atual_live\`
    ORDER BY pipeline, stage_rank ASC
  `;
  return { sql, params: {}, types: {} };
}
