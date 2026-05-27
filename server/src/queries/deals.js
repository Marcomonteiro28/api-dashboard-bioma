import { tbl } from "../config.js";

const ESTAGIO_TO_FLAG = {
  leads: null,
  aguardando_retorno: "is_aguardando_retorno = 1",
  qualificados: "is_qualificado = 1",
  agendamentos: "is_agendamento = 1",
  transferidos: "is_transferido = 1",
  visitas_confirmadas: "is_visita_confirmada = 1",
  visitas: "is_visita = 1",
  negociacoes: "is_negociacao = 1",
  propostas: "is_proposta = 1",
  ganhos: "is_ganho = 1",
};

export function isValidEstagio(estagio) {
  return estagio === "" || Object.prototype.hasOwnProperty.call(ESTAGIO_TO_FLAG, estagio);
}

export function buildDealsQuery({ from, to, emps, statuses, estagio, limit }) {
  const conds = ["DATE(deal_created_at) BETWEEN @from AND @to"];
  const params = { from, to, limit };
  const types = { limit: "INT64" };

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
  const estagioCondition = ESTAGIO_TO_FLAG[estagio];
  if (estagioCondition) conds.push(estagioCondition);

  const sql = `
    SELECT
      CAST(deal_id AS STRING) AS deal_id,
      CAST(contact_id AS STRING) AS contact_id,
      contact_email, contact_nome, contact_phone,
      empreendimento, linha_empreendimento,
      metragem_m2, prioridade,
      origem, sub_origem, gatilho_mql, sdr_responsavel,
      valor_deal, valor_esperado,
      stage_titulo_atual, pipeline_atual, deal_status,
      FORMAT_TIMESTAMP("%Y-%m-%d", deal_created_at) AS deal_created_at,
      FORMAT_TIMESTAMP("%Y-%m-%d", dt_entrada) AS dt_entrada,
      FORMAT_TIMESTAMP("%Y-%m-%d", dt_qualificado) AS dt_qualificado,
      FORMAT_TIMESTAMP("%Y-%m-%d", dt_visita_agendada) AS dt_visita_agendada,
      FORMAT_TIMESTAMP("%Y-%m-%d", dt_visita_confirmada) AS dt_visita_confirmada,
      FORMAT_TIMESTAMP("%Y-%m-%d", dt_visita_realizada) AS dt_visita_realizada,
      FORMAT_TIMESTAMP("%Y-%m-%d", dt_negociacao) AS dt_negociacao,
      FORMAT_TIMESTAMP("%Y-%m-%d", dt_proposta) AS dt_proposta,
      FORMAT_TIMESTAMP("%Y-%m-%d", dt_fechamento) AS dt_fechamento,
      is_aguardando_retorno, is_qualificado, is_agendamento, is_transferido,
      is_visita_confirmada, is_visita, is_negociacao, is_proposta, is_ganho
    FROM ${tbl("stg_crm_deals")}
    WHERE ${conds.join(" AND ")}
    ORDER BY deal_created_at DESC, deal_id DESC
    LIMIT @limit
  `;

  return { sql, params, types };
}
